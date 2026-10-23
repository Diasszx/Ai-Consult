import json
import os
import sqlite3
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient
from google.genai import errors as genai_errors

os.environ.setdefault("DEEPSEEK_API_KEY", "sk-test-deepseek-key")
os.environ.setdefault("LLM_PROVIDER", "deepseek")

from database import CATALOGO_TECNICO, consultar_skus_no_sqlite, init_db
from llm_providers import (
    DeepSeekProvider,
    GeminiProvider,
    LLMProviderError,
    LLMTimeoutError,
     ToolCallback,
    get_llm_provider,
)
from main import app


class FakeInjectedProvider:
    """Provedor Fake para testar a Injeção de Dependência (FastAPI Depends) de forma 100% desacoplada."""

    def __init__(self, skus_to_call: list[str], final_text: str) -> None:
        self.skus_to_call = skus_to_call
        self.final_text = final_text

    def gerar_resposta(
        self,
        system_prompt: str,
        pergunta: str,
        buscar_dados_erp: ToolCallback,
    ) -> str:
        assert "CATÁLOGO TÉCNICO DISPONÍVEL" in system_prompt
        if self.skus_to_call:
            buscar_dados_erp(self.skus_to_call)
        return self.final_text


@pytest.fixture(autouse=True)
def setup_database(tmp_path, monkeypatch):
    """Usa banco SQLite temporário isolado por teste e limpa dependency_overrides."""
    db_file = tmp_path / "test_erp.db"
    monkeypatch.setattr("database.DB_PATH", str(db_file))
    monkeypatch.setenv("LLM_PROVIDER", "deepseek")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-test-deepseek-key")
    init_db()
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_lifespan_fail_fast_without_api_key(monkeypatch):
    """FR-008: Deve abortar a inicialização se a chave do provedor ativo não estiver definida."""
    monkeypatch.setenv("LLM_PROVIDER", "deepseek")
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="DEEPSEEK_API_KEY"):
        with TestClient(app):
            pass


def test_lifespan_fail_fast_invalid_provider(monkeypatch):
    """Edge Case: Deve abortar a inicialização se LLM_PROVIDER for desconhecido."""
    monkeypatch.setenv("LLM_PROVIDER", "provedor_invalido")
    with pytest.raises(RuntimeError, match="inválido"):
        with TestClient(app):
            pass


def test_provider_factory_auto_detection(monkeypatch):
    """FR-005: Factory resolve DeepSeekProvider ou GeminiProvider conforme configuração."""
    monkeypatch.setenv("LLM_PROVIDER", "deepseek")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-12345")
    provider_ds = get_llm_provider()
    assert isinstance(provider_ds, DeepSeekProvider)

    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "AIzaSyTest")
    provider_gm = get_llm_provider()
    assert isinstance(provider_gm, GeminiProvider)

    # Fallback inteligente quando chave sk- está em GEMINI_API_KEY e LLM_PROVIDER não foi definido
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "sk-deepseek-in-gemini-var")
    provider_auto = get_llm_provider()
    assert isinstance(provider_auto, DeepSeekProvider)
    assert provider_auto.api_key == "sk-deepseek-in-gemini-var"


def test_constitution_blocks_legacy_gemini_model():
    """Constitution Principle I: Proíbe modelos inferiores a gemini-3.8-flash."""
    with pytest.raises(ValueError, match="gemini-3.8-flash"):
        GeminiProvider(api_key="test", model="gemini-2.5-flash")


def test_database_seed_and_batch_query():
    """Verifica seed idempotente e consulta parametrizada."""
    init_db()
    res = consultar_skus_no_sqlite(["AMOR-G5-01", "AMOR-G5-02", "VELA-UNO-11"])
    assert res["AMOR-G5-01"]["preco"] == 250.0
    assert res["AMOR-G5-01"]["quantidade"] == 12
    assert res["AMOR-G5-02"]["quantidade"] == 0
    assert "VELA-UNO-11" not in res
    assert consultar_skus_no_sqlite([]) == {}


def test_scenario_1_exact_match_via_dependency_injection():
    """US1 & US2: Match exato de 1 SKU com provedor injetado via FastAPI Depends."""
    fake_reply = (
        "Sim! Temos o Amortecedor Dianteiro Turbogas (SKU: AMOR-G5-01) "
        "por R$ 250,00 com 12 unidades em estoque."
    )
    app.dependency_overrides[get_llm_provider] = lambda: FakeInjectedProvider(
        ["AMOR-G5-01"], fake_reply
    )

    with TestClient(app) as client:
        response = client.post(
            "/consultar-peca",
            json={"pergunta": "  Preciso do amortecedor dianteiro do Gol G5 2012 1.0, tem no estoque?  "},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "sucesso"
    assert len(data["pecas_encontradas"]) == 1
    peca = data["pecas_encontradas"][0]
    assert peca["sku"] == "AMOR-G5-01"
    assert peca["nome_peca"] == CATALOGO_TECNICO["AMOR-G5-01"]["nome_peca"]
    assert peca["em_estoque"] is True
    assert peca["preco"] == 250.0
    assert peca["quantidade"] == 12
    assert data["resposta"] == fake_reply


def test_scenario_2_ambiguous_multi_sku():
    """US2: Pergunta ambígua retornando dianteiro (com estoque) e traseiro (estoque zerado)."""
    fake_reply = "Para o Gol G5 temos o dianteiro (AMOR-G5-01) em estoque e o traseiro (AMOR-G5-02) sem estoque."
    app.dependency_overrides[get_llm_provider] = lambda: FakeInjectedProvider(
        ["amor-g5-01 ", " AMOR-G5-02"], fake_reply
    )

    with TestClient(app) as client:
        response = client.post(
            "/consultar-peca",
            json={"pergunta": "Tem amortecedor pro Gol G5 2011?"},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["pecas_encontradas"]) == 2
    by_sku = {p["sku"]: p for p in data["pecas_encontradas"]}
    assert by_sku["AMOR-G5-01"]["em_estoque"] is True
    assert by_sku["AMOR-G5-01"]["quantidade"] == 12
    assert by_sku["AMOR-G5-02"]["em_estoque"] is False
    assert by_sku["AMOR-G5-02"]["quantidade"] == 0
    assert by_sku["AMOR-G5-02"]["preco"] == 180.0


def test_scenario_3_catalog_vs_erp_conflict():
    """Peça existe no catálogo (VELA-UNO-11), mas não está cadastrada no ERP."""
    fake_reply = "O Jogo de Velas (VELA-UNO-11) consta no catálogo, mas não possui cadastro de preço/estoque no ERP."
    app.dependency_overrides[get_llm_provider] = lambda: FakeInjectedProvider(
        ["VELA-UNO-11"], fake_reply
    )

    with TestClient(app) as client:
        response = client.post(
            "/consultar-peca",
            json={"pergunta": "Quanto tá o jogo de vela do Novo Uno 2012 Fire Evo?"},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["pecas_encontradas"]) == 1
    peca = data["pecas_encontradas"][0]
    assert peca["sku"] == "VELA-UNO-11"
    assert peca["em_estoque"] is False
    assert peca["preco"] is None
    assert peca["quantidade"] is None


def test_scenario_4_guardrail_out_of_scope():
    """Pergunta fora de escopo não aciona a tool e retorna pecas_encontradas vazio."""
    fake_reply = "Desculpe, sou um assistente especializado apenas em autopeças."
    app.dependency_overrides[get_llm_provider] = lambda: FakeInjectedProvider([], fake_reply)

    with TestClient(app) as client:
        response = client.post(
            "/consultar-peca",
            json={"pergunta": "Como fazer um bolo de chocolate fofinho?"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["pecas_encontradas"] == []
    assert data["resposta"] == fake_reply


def test_scenario_5_validation_422():
    """Validação Pydantic rejeita strings curtas (<3) ou longas (>500) com 422."""
    with TestClient(app) as client:
        r_short = client.post("/consultar-peca", json={"pergunta": "  Oi  "})
        r_long = client.post("/consultar-peca", json={"pergunta": "a" * 501})
        r_empty = client.post("/consultar-peca", json={})

    assert r_short.status_code == 422
    assert r_long.status_code == 422
    assert r_empty.status_code == 422


def test_deepseek_adapter_two_step_tool_calling_end_to_end():
    """US1 (P1): Valida o ciclo completo de 2 chamadas HTTP do DeepSeekProvider com tool_calls."""
    first_http_response = MagicMock(spec=httpx.Response)
    first_http_response.status_code = 200
    first_http_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": "call_ds_1",
                            "type": "function",
                            "function": {
                                "name": "buscar_dados_erp",
                                "arguments": json.dumps({"skus": ["AMOR-G5-01"]}),
                            },
                        }
                    ],
                }
            }
        ]
    }

    second_http_response = MagicMock(spec=httpx.Response)
    second_http_response.status_code = 200
    second_http_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Resposta via DeepSeek: AMOR-G5-01 por R$ 250,00 (12 un).",
                }
            }
        ]
    }

    with patch("llm_providers.httpx.Client") as mock_httpx_cls:
        mock_client = mock_httpx_cls.return_value.__enter__.return_value
        mock_client.post.side_effect = [first_http_response, second_http_response]

        with TestClient(app) as client:
            response = client.post(
                "/consultar-peca",
                json={"pergunta": "Preciso do amortecedor dianteiro do Gol G5 2012"},
            )

    assert response.status_code == 200
    data = response.json()
    assert len(data["pecas_encontradas"]) == 1
    assert data["pecas_encontradas"][0]["sku"] == "AMOR-G5-01"
    assert data["pecas_encontradas"][0]["preco"] == 250.0
    assert "DeepSeek" in data["resposta"]
    assert mock_client.post.call_count == 2


def test_gemini_adapter_tool_calling():
    """FR-004: Valida que o GeminiProvider continua funcionando perfeitamente."""
    with patch("llm_providers.genai.Client") as mock_genai_cls:
        mock_client = mock_genai_cls.return_value

        def side_effect(*args, **kwargs):
            config = kwargs.get("config")
            if config and config.tools:
                config.tools[0](["PAST-CIV-10"])
            return SimpleNamespace(text="Temos a pastilha do Civic (PAST-CIV-10) por R$ 145,90.")

        mock_client.models.generate_content.side_effect = side_effect
        app.dependency_overrides[get_llm_provider] = lambda: GeminiProvider(api_key="test-key")

        with TestClient(app) as client:
            response = client.post(
                "/consultar-peca",
                json={"pergunta": "Pastilha dianteira do Civic G10 2019"},
            )

    assert response.status_code == 200
    data = response.json()
    assert len(data["pecas_encontradas"]) == 1
    assert data["pecas_encontradas"][0]["sku"] == "PAST-CIV-10"
    assert data["pecas_encontradas"][0]["preco"] == 145.90


def test_error_mapping_504_timeout():
    """US3 (P3): LLMTimeoutError retorna HTTP 504."""
    class TimeoutProvider:
        def gerar_resposta(self, system_prompt, pergunta, buscar_dados_erp):
            raise LLMTimeoutError("deepseek")

    app.dependency_overrides[get_llm_provider] = lambda: TimeoutProvider()
    with TestClient(app) as client:
        response = client.post(
            "/consultar-peca",
            json={"pergunta": "Preciso do amortecedor do Gol G5"},
        )
    assert response.status_code == 504
    assert "Timeout" in response.json()["detail"]


def test_error_mapping_502_provider_error():
    """US3 (P3): LLMProviderError retorna HTTP 502."""
    class FailingProvider:
        def gerar_resposta(self, system_prompt, pergunta, buscar_dados_erp):
            raise LLMProviderError("deepseek", "Authentication Fails")

    app.dependency_overrides[get_llm_provider] = lambda: FailingProvider()
    with TestClient(app) as client:
        response = client.post(
            "/consultar-peca",
            json={"pergunta": "Preciso do amortecedor do Gol G5"},
        )
    assert response.status_code == 502
    assert "deepseek" in response.json()["detail"]
    assert "Authentication Fails" in response.json()["detail"]


def test_error_mapping_500_sqlite_error():
    """Falha no SQLite retorna HTTP 500."""
    with patch("main.processar_consulta_agente", side_effect=sqlite3.OperationalError("db locked")):
        with TestClient(app) as client:
            response = client.post(
                "/consultar-peca",
                json={"pergunta": "Preciso do amortecedor do Gol G5"},
            )
    assert response.status_code == 500
    assert "banco de dados" in response.json()["detail"]


def test_estoque_crud_and_ai_realtime_sync():
    """
    Feature 004: Testa GET/POST/PUT/DELETE /estoque e verifica que a IA
    recebe imediatamente o catálogo e saldo atualizados na próxima consulta.
    """
    with TestClient(app) as client:
        # 1. Listar estoque inicial (5 peças do seed)
        r_list = client.get("/estoque")
        assert r_list.status_code == 200
        itens_iniciais = r_list.json()
        assert len(itens_iniciais) == 5

        # 2. Adicionar novo item (BATE-ONIX-20)
        novo_payload = {
            "sku": " bate-onix-20 ",
            "nome_peca": "Bateria 60Ah Selada",
            "marca": "Moura",
            "aplicacao": "Chevrolet Onix 2020 a 2024 (1.0 / 1.0 Turbo)",
            "preco": 480.0,
            "quantidade": 6,
        }
        r_create = client.post("/estoque", json=novo_payload)
        assert r_create.status_code == 201
        criado = r_create.json()
        assert criado["sku"] == "BATE-ONIX-20"
        assert criado["em_estoque"] is True
        assert criado["preco"] == 480.0
        assert criado["quantidade"] == 6

        # 3. Tentar duplicar SKU deve retornar 409 Conflict
        r_dup = client.post("/estoque", json=novo_payload)
        assert r_dup.status_code == 409

        # 4. Consultar na IA o novo item recém-criado e validar que está no System Prompt e no ERP
        prompt_capturado: list[str] = []

        class SyncCheckProvider:
            def gerar_resposta(self, system_prompt, pergunta, buscar_dados_erp):
                prompt_capturado.append(system_prompt)
                buscar_dados_erp(["BATE-ONIX-20"])
                return "Temos a Bateria 60Ah Selada (BATE-ONIX-20) por R$ 480,00 com 6 unidades."

        app.dependency_overrides[get_llm_provider] = lambda: SyncCheckProvider()

        r_ai = client.post(
            "/consultar-peca",
            json={"pergunta": "Tem bateria pro Onix 2022?"},
        )
        assert r_ai.status_code == 200
        ai_data = r_ai.json()
        assert "BATE-ONIX-20" in prompt_capturado[0]
        assert "Chevrolet Onix 2020 a 2024" in prompt_capturado[0]
        assert len(ai_data["pecas_encontradas"]) == 1
        assert ai_data["pecas_encontradas"][0]["sku"] == "BATE-ONIX-20"
        assert ai_data["pecas_encontradas"][0]["preco"] == 480.0
        assert ai_data["pecas_encontradas"][0]["quantidade"] == 6

        # 5. Editar o item (alterando preço para 450.0 e quantidade para 15)
        r_update = client.put(
            "/estoque/BATE-ONIX-20",
            json={
                "nome_peca": "Bateria 60Ah Moura EFB",
                "marca": "Moura",
                "aplicacao": "Chevrolet Onix 2020 a 2024",
                "preco": 450.0,
                "quantidade": 15,
            },
        )
        assert r_update.status_code == 200
        assert r_update.json()["preco"] == 450.0
        assert r_update.json()["quantidade"] == 15

        # Consultar novamente na IA e verificar que o preço e nome mudaram em tempo real
        r_ai_after_edit = client.post(
            "/consultar-peca",
            json={"pergunta": "Qual o novo preço da bateria do Onix?"},
        )
        assert r_ai_after_edit.status_code == 200
        peca_editada = r_ai_after_edit.json()["pecas_encontradas"][0]
        assert peca_editada["nome_peca"] == "Bateria 60Ah Moura EFB"
        assert peca_editada["preco"] == 450.0
        assert peca_editada["quantidade"] == 15

        # 6. Excluir o item
        r_del = client.delete("/estoque/BATE-ONIX-20")
        assert r_del.status_code == 200

        # Verificar que não consta mais no System Prompt da IA
        prompt_capturado.clear()
        client.post(
            "/consultar-peca",
            json={"pergunta": "Ainda tem a bateria do Onix?"},
        )
        assert "BATE-ONIX-20" not in prompt_capturado[0]

        # Excluir SKU inexistente retorna 404
        r_del_404 = client.delete("/estoque/SKU-INEXISTENTE")
        assert r_del_404.status_code == 404


def test_orcamento_por_cliente_aprovar_baixa_estoque_e_conflito_409():
    """
    Feature 005: Testa o fluxo completo de Orçamentos por Cliente:
    1. Criação vinculada ao cliente (POST /orcamentos)
    2. Listagem (GET /orcamentos)
    3. Aprovação com baixa automática em estoque_erp (PATCH /orcamentos/{id}/status)
    4. Conflito 409 se tentar aprovar orçamento sem saldo suficiente
    5. Exclusão (DELETE /orcamentos/{id})
    """
    with TestClient(app) as client:
        # 1. Criar orçamento para o cliente Carlos Mendes (2x AMOR-G5-01 que tem 12 un. no seed)
        payload_orcamento = {
            "cliente_nome": "  Carlos Mendes  ",
            "cliente_telefone": "(11) 98765-4321",
            "cliente_veiculo": "Volkswagen Gol G5 2012 1.0",
            "observacoes": "Retirada no balcão",
            "itens": [
                {
                    "sku": "amor-g5-01",
                    "nome_peca": "Amortecedor Dianteiro Turbogas",
                    "preco_unitario": 250.0,
                    "quantidade": 2,
                }
            ],
        }
        r_post = client.post("/orcamentos", json=payload_orcamento)
        assert r_post.status_code == 201
        orc = r_post.json()
        assert orc["codigo"] == "ORC-0001"
        assert orc["cliente_nome"] == "Carlos Mendes"
        assert orc["cliente_telefone"] == "(11) 98765-4321"
        assert orc["cliente_veiculo"] == "Volkswagen Gol G5 2012 1.0"
        assert orc["status"] == "pendente"
        assert orc["valor_total"] == 500.0
        assert len(orc["itens"]) == 1
        assert orc["itens"][0]["sku"] == "AMOR-G5-01"
        assert orc["itens"][0]["subtotal"] == 500.0

        # 2. Listar orçamentos
        r_list = client.get("/orcamentos")
        assert r_list.status_code == 200
        lista = r_list.json()
        assert len(lista) == 1
        assert lista[0]["cliente_nome"] == "Carlos Mendes"

        # 3. Aprovar orçamento -> deve baixar 2 unidades de AMOR-G5-01 (de 12 para 10)
        r_approve = client.patch(f"/orcamentos/{orc['id']}/status", json={"status": "aprovado"})
        assert r_approve.status_code == 200
        assert r_approve.json()["status"] == "aprovado"

        # Verificar que no estoque o saldo de AMOR-G5-01 caiu de 12 para 10
        r_est = client.get("/estoque")
        by_sku = {item["sku"]: item for item in r_est.json()}
        assert by_sku["AMOR-G5-01"]["quantidade"] == 10

        # 4. Criar segundo orçamento pedindo 20 unidades de AMOR-G5-01 (só há 10 disponíveis)
        r_post2 = client.post(
            "/orcamentos",
            json={
                "cliente_nome": "Mariana Silva",
                "cliente_telefone": "11999998888",
                "cliente_veiculo": "Voyage 2011",
                "observacoes": "",
                "itens": [
                    {
                        "sku": "AMOR-G5-01",
                        "nome_peca": "Amortecedor Dianteiro Turbogas",
                        "preco_unitario": 250.0,
                        "quantidade": 20,
                    }
                ],
            },
        )
        assert r_post2.status_code == 201
        orc2 = r_post2.json()

        # Tentar aprovar orc2 sem saldo suficiente deve retornar 409 Conflict e manter saldo em 10
        r_approve_fail = client.patch(
            f"/orcamentos/{orc2['id']}/status",
            json={"status": "aprovado"},
        )
        assert r_approve_fail.status_code == 409
        assert "AMOR-G5-01" in r_approve_fail.json()["detail"]

        # 5. Excluir segundo orçamento
        r_del = client.delete(f"/orcamentos/{orc2['id']}")
        assert r_del.status_code == 200
        assert len(client.get("/orcamentos").json()) == 1


