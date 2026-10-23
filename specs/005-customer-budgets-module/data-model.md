# Data Model: Módulo de Orçamentos por Cliente

## 1. DDL SQLite (`autoparts-ai/database.py`)

```sql
CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_nome TEXT NOT NULL,
    cliente_telefone TEXT NOT NULL,
    cliente_veiculo TEXT DEFAULT '',
    observacoes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pendente',
    valor_total REAL NOT NULL,
    criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orcamento_id INTEGER NOT NULL,
    sku TEXT NOT NULL,
    nome_peca TEXT NOT NULL,
    preco_unitario REAL NOT NULL,
    quantidade INT NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE
);
```

---

## 2. Schemas Pydantic v2 (`autoparts-ai/schemas.py`)

```python
class OrcamentoItemInput(BaseModel):
    sku: str = Field(..., min_length=2, max_length=40)
    nome_peca: str = Field(..., min_length=2, max_length=150)
    preco_unitario: float = Field(..., ge=0.0)
    quantidade: int = Field(..., ge=1)


class OrcamentoCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    cliente_nome: str = Field(..., min_length=2, max_length=120)
    cliente_telefone: str = Field(..., min_length=8, max_length=30)
    cliente_veiculo: str = Field(default="", max_length=120)
    observacoes: str = Field(default="", max_length=300)
    itens: list[OrcamentoItemInput] = Field(..., min_length=1)


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
```

---

## 3. Interfaces TypeScript & Schema Zod (`autoparts-web/src/`)

```typescript
export type StatusOrcamento = "pendente" | "aprovado" | "cancelado";

export interface OrcamentoItemSalvo {
  sku: string;
  nome_peca: string;
  preco_unitario: number;
  quantidade: number;
  subtotal: number;
}

export interface OrcamentoCliente {
  id: number;
  codigo: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_veiculo: string;
  observacoes: string;
  status: StatusOrcamento;
  valor_total: number;
  criado_em: string;
  itens: OrcamentoItemSalvo[];
}
```
