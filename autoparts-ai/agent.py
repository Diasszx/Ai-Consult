import json
from typing import Any

from database import consultar_skus_no_sqlite, obter_catalogo_atual
from llm_providers import LLMProvider, get_llm_provider
from schemas import PecaERP


def _montar_system_prompt(catalogo_atual: dict[str, dict[str, str]] | None = None) -> str:
    catalogo = catalogo_atual if catalogo_atual is not None else obter_catalogo_atual()
    catalogo_str = json.dumps(list(catalogo.values()), ensure_ascii=False, indent=2)
    return f"""Você é um assistente técnico e comercial especializado em autopeças (Aftermarket).

REGRA DE ESCOPO (GUARDRAIL):
- Responda estritamente sobre autopeças, aplicações automotivas, preços e estoque.
- Se o usuário perguntar qualquer assunto fora do escopo automotivo, recuse educadamente e não acione ferramentas.

CATÁLOGO TÉCNICO DISPONÍVEL:
{catalogo_str}

INSTRUÇÕES DE EXECUÇÃO:
1. Analise a solicitação do usuário e cruze com o CATÁLOGO TÉCNICO acima.
2. Caso a pergunta seja genérica (ex: pediu amortecedor sem especificar dianteiro ou traseiro), selecione TODOS os SKUs compatíveis do catálogo.
3. Chame OBRIGATORIAMENTE a ferramenta `buscar_dados_erp` passando a lista de `skus` identificados antes de responder sobre preços ou disponibilidade.
4. Nunca invente preços, saldos de estoque ou códigos SKU. Caso o item não exista no catálogo ou retorne como não cadastrado no ERP, informe de forma transparente.
5. Formate valores monetários no padrão brasileiro (R$ X,XX).

DIRETRIZES DE FORMATAÇÃO E TOM DE RESPOSTA (RIGOROSO):
- Seja curto, direto e objetivo: responda em apenas 1 ou 2 frases resumindo a disponibilidade geral do que foi perguntado.
- NÃO liste ficha técnica no texto (NÃO repita SKU, marca, aplicação detalhada ou lista de preços no texto), pois a interface já exibe todas essas informações dentro dos cards visuais do produto logo abaixo da sua mensagem.
- NUNCA faça perguntas adicionais ou sugestões não solicitadas no final (como "quer que eu verifique algo mais?", "precisa do par completo?", "posso ajudar em algo mais?")."""


def processar_consulta_agente(
    pergunta: str,
    provider: LLMProvider | None = None,
) -> tuple[str, list[PecaERP]]:
    """
    Orquestra a consulta de autopeças lendo o catálogo técnico atualizado do SQLite.
    Utiliza o Closure Pattern para capturar os metadados diretamente do SQLite.
    """
    llm = provider if provider is not None else get_llm_provider()
    catalogo_atual = obter_catalogo_atual()

    # Buffer isolado no escopo desta requisição (Thread-safe / Sem race conditions)
    pecas_capturadas: dict[str, PecaERP] = {}

    def buscar_dados_erp(skus: list[str]) -> list[dict[str, Any]]:
        """Consulta preço unitário e quantidade em estoque no ERP para uma lista de códigos SKU.

        Args:
            skus: Lista de códigos SKU exatos extraídos do catálogo técnico (ex: ['AMOR-G5-01', 'AMOR-G5-02']).
        """
        skus_limpos = [s.strip().upper() for s in skus if s.strip()]
        dados_banco = consultar_skus_no_sqlite(skus_limpos)
        retorno_para_llm: list[dict[str, Any]] = []

        for sku in skus_limpos:
            info_cat = catalogo_atual.get(sku)
            nome_peca = info_cat["nome_peca"] if info_cat else "Peça não identificada no catálogo"
            marca = info_cat.get("marca", "") if info_cat else ""
            aplicacao = info_cat.get("aplicacao", "") if info_cat else ""
            registro_erp = dados_banco.get(sku)

            if registro_erp:
                qtd = int(registro_erp["quantidade"])
                preco = float(registro_erp["preco"])
                em_estoque = qtd > 0

                pecas_capturadas[sku] = PecaERP(
                    sku=sku,
                    nome_peca=nome_peca,
                    marca=marca,
                    aplicacao=aplicacao,
                    em_estoque=em_estoque,
                    preco=preco,
                    quantidade=qtd,
                )
                retorno_para_llm.append({
                    "sku": sku,
                    "nome_peca": nome_peca,
                    "marca": marca,
                    "aplicacao": aplicacao,
                    "cadastrado_no_erp": True,
                    "em_estoque": em_estoque,
                    "preco": preco,
                    "quantidade": qtd,
                })
            else:
                pecas_capturadas[sku] = PecaERP(
                    sku=sku,
                    nome_peca=nome_peca,
                    marca=marca,
                    aplicacao=aplicacao,
                    em_estoque=False,
                    preco=None,
                    quantidade=None,
                )
                retorno_para_llm.append({
                    "sku": sku,
                    "nome_peca": nome_peca,
                    "marca": marca,
                    "aplicacao": aplicacao,
                    "cadastrado_no_erp": False,
                    "em_estoque": False,
                    "mensagem": "SKU consta no catálogo técnico, mas não possui cadastro de preço/estoque no ERP.",
                })

        return retorno_para_llm

    texto_final = llm.gerar_resposta(
        system_prompt=_montar_system_prompt(catalogo_atual),
        pergunta=pergunta,
        buscar_dados_erp=buscar_dados_erp,
    )

    return texto_final, list(pecas_capturadas.values())
