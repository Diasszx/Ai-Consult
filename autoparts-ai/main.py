import sqlite3
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import httpx

from agent import processar_consulta_agente
from database import (
    atualizar_item_estoque,
    atualizar_status_orcamento,
    criar_item_estoque,
    criar_orcamento,
    excluir_item_estoque,
    excluir_orcamento,
    init_db,
    listar_itens_estoque,
    listar_orcamentos,
)
from llm_providers import (
    LLMProvider,
    LLMProviderError,
    LLMTimeoutError,
    get_llm_provider,
    validar_configuracao_llm,
)
from schemas import (
    ConsultaRequest,
    ConsultaResponse,
    EstoqueCreateRequest,
    EstoqueItemResponse,
    EstoqueUpdateRequest,
    OrcamentoCreateRequest,
    OrcamentoResponse,
    OrcamentoStatusUpdateRequest,
)

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    validar_configuracao_llm()
    init_db()
    yield


app = FastAPI(
    title="AutoParts AI & ERP Integrator",
    version="2.2.0",
    description="Assistente técnico de autopeças e Módulo de Estoque ERP SQLite sincronizado com IA.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/consultar-peca", response_model=ConsultaResponse)
def consultar_peca(
    payload: ConsultaRequest,
    provider: LLMProvider = Depends(get_llm_provider),
) -> ConsultaResponse:
    """Rota síncrona (executada em threadpool pelo FastAPI) com Provedor de IA injetado via Depends."""
    try:
        resposta_llm, pecas = processar_consulta_agente(payload.pergunta, provider=provider)
        return ConsultaResponse(
            status="sucesso",
            pecas_encontradas=pecas,
            resposta=resposta_llm,
        )
    except (LLMTimeoutError, httpx.TimeoutException) as exc:
        detail = str(exc) if isinstance(exc, LLMTimeoutError) else "Timeout ao aguardar resposta do provedor de IA."
        raise HTTPException(
            status_code=504,
            detail=detail,
        ) from exc
    except LLMProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao consultar o banco de dados do ERP.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao processar a requisição com a LLM ou ERP.",
        ) from exc


@app.get("/estoque", response_model=list[EstoqueItemResponse])
def get_estoque() -> list[EstoqueItemResponse]:
    """Lista todos os itens cadastrados no ERP."""
    try:
        itens = listar_itens_estoque()
        return [EstoqueItemResponse(**item) for item in itens]
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro ao listar itens do estoque no banco de dados.",
        ) from exc


@app.post("/estoque", response_model=EstoqueItemResponse, status_code=status.HTTP_201_CREATED)
def post_estoque(payload: EstoqueCreateRequest) -> EstoqueItemResponse:
    """Adiciona uma nova peça ao catálogo técnico e ao estoque do ERP."""
    try:
        novo_item = criar_item_estoque(
            sku=payload.sku,
            nome_peca=payload.nome_peca,
            marca=payload.marca,
            aplicacao=payload.aplicacao,
            preco=payload.preco,
            quantidade=payload.quantidade,
        )
        return EstoqueItemResponse(**novo_item)
    except ValueError as exc:
        if "SKU_DUPLICADO" in str(exc):
            sku_norm = payload.sku.strip().upper()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe uma peça cadastrada com o SKU '{sku_norm}'.",
            ) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao cadastrar peça no banco de dados.",
        ) from exc


@app.put("/estoque/{sku}", response_model=EstoqueItemResponse)
def put_estoque(sku: str, payload: EstoqueUpdateRequest) -> EstoqueItemResponse:
    """Atualiza os dados técnicos, preço e quantidade em estoque de uma peça existente."""
    try:
        atualizado = atualizar_item_estoque(
            sku=sku,
            nome_peca=payload.nome_peca,
            marca=payload.marca,
            aplicacao=payload.aplicacao,
            preco=payload.preco,
            quantidade=payload.quantidade,
        )
        if atualizado is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Peça com SKU '{sku.strip().upper()}' não encontrada.",
            )
        return EstoqueItemResponse(**atualizado)
    except HTTPException:
        raise
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao atualizar peça no banco de dados.",
        ) from exc


@app.delete("/estoque/{sku}")
def delete_estoque(sku: str) -> dict[str, str]:
    """Remove uma peça do estoque e do catálogo técnico."""
    try:
        removido = excluir_item_estoque(sku)
        if not removido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Peça com SKU '{sku.strip().upper()}' não encontrada.",
            )
        return {
            "status": "sucesso",
            "mensagem": f"Peça '{sku.strip().upper()}' removida com sucesso.",
        }
    except HTTPException:
        raise
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao excluir peça no banco de dados.",
        ) from exc


@app.post("/orcamentos", response_model=OrcamentoResponse, status_code=status.HTTP_201_CREATED)
def post_orcamento(payload: OrcamentoCreateRequest) -> OrcamentoResponse:
    """Cria e confirma um novo orçamento vinculado a um cliente."""
    try:
        novo_orcamento = criar_orcamento(
            cliente_nome=payload.cliente_nome,
            cliente_telefone=payload.cliente_telefone,
            cliente_veiculo=payload.cliente_veiculo,
            observacoes=payload.observacoes,
            itens=[item.model_dump() for item in payload.itens],
        )
        return OrcamentoResponse(**novo_orcamento)
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao salvar o orçamento no banco de dados.",
        ) from exc


@app.get("/orcamentos", response_model=list[OrcamentoResponse])
def get_orcamentos() -> list[OrcamentoResponse]:
    """Lista todos os orçamentos confirmados por cliente."""
    try:
        orcamentos = listar_orcamentos()
        return [OrcamentoResponse(**orc) for orc in orcamentos]
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao listar os orçamentos no banco de dados.",
        ) from exc


@app.patch("/orcamentos/{orcamento_id}/status", response_model=OrcamentoResponse)
def patch_status_orcamento(
    orcamento_id: int,
    payload: OrcamentoStatusUpdateRequest,
) -> OrcamentoResponse:
    """
    Atualiza o status de um orçamento ('pendente', 'aprovado', 'cancelado').
    Quando alterado para 'aprovado', realiza baixa automática de estoque em estoque_erp.
    """
    try:
        atualizado = atualizar_status_orcamento(orcamento_id, payload.status)
        if atualizado is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Orçamento #{orcamento_id} não encontrado.",
            )
        return OrcamentoResponse(**atualizado)
    except ValueError as exc:
        msg = str(exc)
        if msg.startswith("SALDO_INSUFICIENTE:"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=msg.replace("SALDO_INSUFICIENTE:", "").strip(),
            ) from exc
        raise HTTPException(status_code=400, detail=msg) from exc
    except HTTPException:
        raise
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao atualizar o status do orçamento.",
        ) from exc


@app.delete("/orcamentos/{orcamento_id}")
def delete_orcamento(orcamento_id: int) -> dict[str, str]:
    """Remove um orçamento do banco de dados."""
    try:
        removido = excluir_orcamento(orcamento_id)
        if not removido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Orçamento #{orcamento_id} não encontrado.",
            )
        return {
            "status": "sucesso",
            "mensagem": f"Orçamento #{orcamento_id} removido com sucesso.",
        }
    except HTTPException:
        raise
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao excluir o orçamento.",
        ) from exc

