from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class ConsultaRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    pergunta: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Pergunta em linguagem natural sobre autopeças.",
        examples=["Preciso do amortecedor dianteiro do Gol G5 2012 1.0, tem no estoque?"],
    )


class PecaERP(BaseModel):
    sku: str
    nome_peca: str
    marca: str = ""
    aplicacao: str = ""
    em_estoque: bool
    preco: float | None = None
    quantidade: int | None = None


class ConsultaResponse(BaseModel):
    status: str = "sucesso"
    pecas_encontradas: list[PecaERP]
    resposta: str


class EstoqueItemResponse(BaseModel):
    sku: str
    nome_peca: str
    marca: str
    aplicacao: str
    preco: float | None = None
    quantidade: int | None = None
    em_estoque: bool


class EstoqueCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    sku: str = Field(..., min_length=2, max_length=40, description="Código único SKU da peça")
    nome_peca: str = Field(..., min_length=3, max_length=150, description="Nome comercial da peça")
    marca: str = Field(..., min_length=2, max_length=80, description="Marca / Fabricante")
    aplicacao: str = Field(..., min_length=3, max_length=250, description="Veículos e anos compatíveis")
    preco: float = Field(..., ge=0.0, description="Preço unitário em R$")
    quantidade: int = Field(..., ge=0, description="Quantidade disponível em estoque")


class EstoqueUpdateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nome_peca: str = Field(..., min_length=3, max_length=150, description="Nome comercial da peça")
    marca: str = Field(..., min_length=2, max_length=80, description="Marca / Fabricante")
    aplicacao: str = Field(..., min_length=3, max_length=250, description="Veículos e anos compatíveis")
    preco: float = Field(..., ge=0.0, description="Preço unitário em R$")
    quantidade: int = Field(..., ge=0, description="Quantidade disponível em estoque")


class OrcamentoItemInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    sku: str = Field(..., min_length=2, max_length=40, description="Código SKU da peça")
    nome_peca: str = Field(..., min_length=2, max_length=150, description="Nome da peça")
    preco_unitario: float = Field(..., ge=0.0, description="Preço unitário no momento do orçamento")
    quantidade: int = Field(..., ge=1, description="Quantidade orçada")


class OrcamentoCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    cliente_nome: str = Field(..., min_length=2, max_length=120, description="Nome completo do cliente")
    cliente_telefone: str = Field(..., min_length=8, max_length=30, description="Telefone ou WhatsApp do cliente")
    cliente_veiculo: str = Field(default="", max_length=120, description="Modelo, ano ou placa do veículo")
    observacoes: str = Field(default="", max_length=300, description="Observações adicionais do orçamento")
    itens: list[OrcamentoItemInput] = Field(..., min_length=1, description="Lista de peças do orçamento")


class OrcamentoStatusUpdateRequest(BaseModel):
    status: Literal["pendente", "aprovado", "cancelado"]


class OrcamentoItemResponse(BaseModel):
    sku: str
    nome_peca: str
    preco_unitario: float
    quantidade: int
    subtotal: float


class OrcamentoResponse(BaseModel):
    id: int
    codigo: str
    cliente_nome: str
    cliente_telefone: str
    cliente_veiculo: str
    observacoes: str
    status: str
    valor_total: float
    criado_em: str
    itens: list[OrcamentoItemResponse]

