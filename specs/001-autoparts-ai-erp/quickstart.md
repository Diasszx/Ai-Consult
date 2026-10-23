# Quickstart & Validation Guide: AutoParts AI & ERP Integrator

Guia de validação end-to-end para desenvolvedores e QA testarem as capacidades do sistema.

## Pré-requisitos
- Python 3.10 ou superior
- Chave de API ativa do Google AI Studio (`GEMINI_API_KEY`)

## 1. Configuração do Ambiente

```bash
# Navegar até a pasta do projeto
cd autoparts-ai

# Criar e ativar o ambiente virtual (recomendado)
python -m venv .venv

# No Windows PowerShell:
.venv\Scripts\Activate.ps1
# No Linux / macOS:
# source .venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Configurar variável de ambiente no arquivo .env ou no terminal
# Exemplo Windows PowerShell:
$env:GEMINI_API_KEY="SUA_CHAVE_AQUI"
# Exemplo Linux/Bash:
# export GEMINI_API_KEY="SUA_CHAVE_AQUI"
```

## 2. Inicialização do Servidor

```bash
uvicorn main:app --reload --port 8000
```
- Swagger UI interativo disponível em: `http://127.0.0.1:8000/docs`
- OpenAPI JSON em: `http://127.0.0.1:8000/openapi.json`

---

## 3. Cenários de Teste e Validação

### Cenário 1: Match Exato (1 SKU com estoque disponível)
- **Objetivo**: Garantir que a IA identifica a peça, chama a tool do ERP e retorna saldo e preço exatos.
- **Requisição**:
```bash
curl -X POST http://127.0.0.1:8000/consultar-peca \
  -H "Content-Type: application/json" \
  -d '{"pergunta": "Preciso do amortecedor dianteiro do Gol G5 2012 1.0, tem no estoque?"}'
```
- **Resultado Esperado (200 OK)**:
  - `status`: `"sucesso"`
  - `pecas_encontradas`: contém `sku: "AMOR-G5-01"`, `em_estoque: true`, `preco: 250.0`, `quantidade: 12`.
  - `resposta`: texto sintetizado confirmando 12 unidades por R$ 250,00.

---

### Cenário 2: Pergunta Ambígua (Múltiplos SKUs: Dianteiro + Traseiro)
- **Objetivo**: Garantir que o sistema traga todas as variantes e processe simultaneamente itens com e sem estoque.
- **Requisição**:
```bash
curl -X POST http://127.0.0.1:8000/consultar-peca \
  -H "Content-Type: application/json" \
  -d '{"pergunta": "Tem amortecedor pro Gol G5 2011?"}'
```
- **Resultado Esperado (200 OK)**:
  - `pecas_encontradas`: 2 itens (`AMOR-G5-01` com `em_estoque=true` e `AMOR-G5-02` com `em_estoque=false`, `quantidade=0`).
  - `resposta`: texto explicando as opções e informando que a traseira está esgotada.

---

### Cenário 3: Conflito Catálogo vs. ERP (Peça no catálogo, mas não no ERP)
- **Objetivo**: Validar a resiliência a descasamento cadastral.
- **Requisição**:
```bash
curl -X POST http://127.0.0.1:8000/consultar-peca \
  -H "Content-Type: application/json" \
  -d '{"pergunta": "Quanto tá o jogo de vela do Novo Uno 2012 Fire Evo?"}'
```
- **Resultado Esperado (200 OK)**:
  - `pecas_encontradas`: item `VELA-UNO-11` com `em_estoque: false`, `preco: null`, `quantidade: null`.
  - `resposta`: esclarecendo que a peça é compatível, mas está sem cadastro ativo de preço/estoque no ERP.

---

### Cenário 4: Guardrail de Escopo (Pergunta fora do contexto automotivo)
- **Objetivo**: Garantir que o agente não acione ferramentas nem responda a tópicos irrelevantes.
- **Requisição**:
```bash
curl -X POST http://127.0.0.1:8000/consultar-peca \
  -H "Content-Type: application/json" \
  -d '{"pergunta": "Como fazer um bolo de chocolate fofinho?"}'
```
- **Resultado Esperado (200 OK)**:
  - `pecas_encontradas`: `[]` (vazio).
  - `resposta`: recusa educada informando que atende apenas a autopeças e aplicações automotivas.

---

### Cenário 5: Validação de Entrada com Pydantic (HTTP 422)
- **Requisição**:
```bash
curl -X POST http://127.0.0.1:8000/consultar-peca \
  -H "Content-Type: application/json" \
  -d '{"pergunta": "   Oi   "}'
```
- **Resultado Esperado**: HTTP `422 Unprocessable Entity` (após o strip, a string tem 2 caracteres, abaixo do mínimo exigido de 3).
