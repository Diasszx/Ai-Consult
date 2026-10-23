# Contract Specification: Customer Budgets REST API (`/orcamentos`)

## 1. `POST /orcamentos`
Cria e confirma um novo orçamento vinculado a um cliente.

- **Request Body**:
```json
{
  "cliente_nome": "Carlos Mendes",
  "cliente_telefone": "(11) 98765-4321",
  "cliente_veiculo": "Volkswagen Gol G5 2012 1.0",
  "observacoes": "Entrega no balcão",
  "itens": [
    {
      "sku": "AMOR-G5-01",
      "nome_peca": "Amortecedor Dianteiro Turbogas",
      "preco_unitario": 250.0,
      "quantidade": 2
    }
  ]
}
```
- **Response `201 Created`**: `OrcamentoResponse` (com `codigo: "ORC-0001"` e `valor_total: 500.0`).

---

## 2. `GET /orcamentos`
Lista todos os orçamentos confirmados por cliente (ordenados do mais recente para o mais antigo).

- **Response `200 OK`**: `list[OrcamentoResponse]`

---

## 3. `PATCH /orcamentos/{orcamento_id}/status`
Atualiza o status do orçamento (`pendente`, `aprovado`, `cancelado`). Se alterado de `pendente` para `aprovado`, desconta automaticamente as quantidades em `estoque_erp`.

- **Request Body**:
```json
{
  "status": "aprovado"
}
```
- **Responses**:
  - `200 OK`: `OrcamentoResponse` atualizado
  - `404 Not Found`: Orçamento não encontrado
  - `409 Conflict`: Saldo insuficiente no estoque para aprovar o orçamento

---

## 4. `DELETE /orcamentos/{orcamento_id}`
Remove um orçamento e seus itens.

- **Responses**:
  - `200 OK`: `{"status": "sucesso", "mensagem": "Orçamento removido com sucesso."}`
  - `404 Not Found`: Orçamento não encontrado
