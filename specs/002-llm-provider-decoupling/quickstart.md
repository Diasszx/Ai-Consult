# Quickstart & Validation Guide: Provedor de IA Desacoplado (DeepSeek / Gemini)

Guia rápido para alternar entre **DeepSeek** e **Gemini** via Injeção de Dependência sem modificar o código da aplicação.

## 1. Usando o Provedor DeepSeek (Recomendado)

No terminal PowerShell (ou no arquivo `autoparts-ai/.env`):

```powershell
cd autoparts-ai
$env:LLM_PROVIDER="deepseek"
$env:DEEPSEEK_API_KEY="sk-sua_chave_deepseek_aqui"
.\.venv\Scripts\uvicorn.exe main:app --reload
```

### Testando a Consulta com DeepSeek:
```powershell
curl.exe -X POST http://127.0.0.1:8000/consultar-peca `
  -H "Content-Type: application/json" `
  -d '{\"pergunta\": \"Preciso do amortecedor dianteiro do Gol G5 2012 1.0, tem no estoque?\"}'
```

---

## 2. Alternando para o Provedor Google Gemini

Sem alterar nenhuma linha de código em `main.py` ou `agent.py`, basta trocar as variáveis:

```powershell
cd autoparts-ai
$env:LLM_PROVIDER="gemini"
$env:GEMINI_API_KEY="sua_chave_gemini_aqui"
.\.venv\Scripts\uvicorn.exe main:app --reload
```

---

## 3. Substituindo o Provedor via Código / Testes (FastAPI `dependency_overrides`)

Como a rota `POST /consultar-peca` recebe `provider: LLMProvider = Depends(get_llm_provider)`, você também pode injetar qualquer classe customizada diretamente no FastAPI:

```python
from llm_providers import get_llm_provider

app.dependency_overrides[get_llm_provider] = lambda: MeuProvedorCustomizado()
```

---

## 4. Executando a Suíte de Testes Automatizados

```powershell
cd autoparts-ai
.\.venv\Scripts\pytest.exe -v
```
Valida todos os cenários tanto para o `DeepSeekProvider` (incluindo o ciclo de `tool_calls` em 2 etapas) quanto para o `GeminiProvider`, além da injeção de dependência e tratamento de erros 422, 502, 504 e 500.
