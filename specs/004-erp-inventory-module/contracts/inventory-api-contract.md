# Contract Specification: ERP Inventory REST API (`/estoque`)

## 1. `GET /estoque`
Retorna a lista completa de peças cadastradas (catálogo + estoque operacional).

- **Response `200 OK`**:
```json
[
  {
    "sku": "AMOR-G5-01",
    "nome_peca": "Amortecedor Dianteiro Turbogas",
    "marca": "Cofap",
    "aplicacao": "Volkswagen Gol G5 2009 a 2012 (1.0 / 1.6), Voyage G5 2009 a 2012",
    "preco": 250.0,
    "quantidade": 12,
    "em_estoque": true
  }
]
```

---

## 2. `POST /estoque`
Adiciona uma nova peça ao catálogo técnico e ao estoque do ERP.

- **Request Body**:
```json
{
  "sku": "BATE-ONIX-20",
  "nome_peca": "Bateria 60Ah Selada",
  "marca": "Moura",
  "aplicacao": "Chevrolet Onix 2020 a 2024 (1.0 / 1.0 Turbo)",
  "preco": 480.0,
  "quantidade": 6
}
```
- **Responses**:
  - `201 Created`: `EstoqueItemResponse` (com `sku` normalizado em maiúsculas)
  - `409 Conflict`: `{"detail": "Já existe uma peça cadastrada com o SKU 'BATE-ONIX-20'."}`
  - `422 Unprocessable Entity`: Erro de validação Pydantic v2

---

## 3. `PUT /estoque/{sku}`
Atualiza nome, marca, aplicação, preço e quantidade de uma peça existente (criando o registro em `estoque_erp` caso a peça estivesse apenas no catálogo técnico, como `VELA-UNO-11`).

- **Request Body**:
```json
{
  "nome_peca": "Amortecedor Traseiro Turbogas",
  "marca": "Cofap",
  "aplicacao": "Volkswagen Gol G5 2009 a 2012 (1.0 / 1.6)",
  "preco": 195.0,
  "quantidade": 15
}
```
- **Responses**:
  - `200 OK`: `EstoqueItemResponse`
  - `404 Not Found`: `{"detail": "Peça com SKU '...' não encontrada."}`

---

## 4. `DELETE /estoque/{sku}`
Remove a peça do estoque e do catálogo técnico.

- **Responses**:
  - `200 OK`: `{"status": "sucesso", "mensagem": "Peça 'AMOR-G5-01' removida com sucesso."}`
  - `404 Not Found`: `{"detail": "Peça com SKU '...' não encontrada."}`
