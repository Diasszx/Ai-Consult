# Contract Specification: LLM Provider Dependency Injection & REST API

## 1. Contrato de Injeção de Dependência (`LLMProvider`)

```python
from typing import Callable, Protocol

ToolCallback = Callable[[list[str]], list[dict]]


class LLMProvider(Protocol):
    """Interface abstrata para injeção de dependência de motores de IA."""

    def gerar_resposta(
        self,
        system_prompt: str,
        pergunta: str,
        buscar_dados_erp: ToolCallback,
    ) -> str:
        """
        Processa a pergunta do usuário com base no system_prompt.
        Aciona buscar_dados_erp(skus) quando identificar SKUs compatíveis.
        Lança LLMTimeoutError em caso de timeout (>15s).
        Lança LLMProviderError em caso de falha de comunicação/API.
        """
        ...
```

## 2. Schema da Ferramenta para Provedores OpenAI-Compatible (DeepSeek)

```json
{
  "type": "function",
  "function": {
    "name": "buscar_dados_erp",
    "description": "Consulta preço unitário e quantidade em estoque no ERP para uma lista de códigos SKU.",
    "parameters": {
      "type": "object",
      "properties": {
        "skus": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Lista de códigos SKU exatos extraídos do catálogo técnico (ex: ['AMOR-G5-01', 'AMOR-G5-02'])."
        }
      },
      "required": ["skus"]
    }
  }
}
```

## 3. Variáveis de Ambiente Suportadas

| Variável | Obrigatória | Valores / Padrão | Descrição |
|---|---|---|---|
| `LLM_PROVIDER` | Opcional | `"deepseek"` ou `"gemini"` | Define qual provedor será injetado por `get_llm_provider()`. Se omitido, seleciona `"deepseek"` quando `DEEPSEEK_API_KEY` existir, senão `"gemini"`. |
| `DEEPSEEK_API_KEY` | Condicional | `sk-...` | Obrigatória quando o provedor ativo for `deepseek`. |
| `DEEPSEEK_MODEL` | Opcional | `"deepseek-chat"` | Nome do modelo da DeepSeek. |
| `DEEPSEEK_BASE_URL` | Opcional | `"https://api.deepseek.com"` | URL base da API da DeepSeek. |
| `GEMINI_API_KEY` | Condicional | `AIza...` | Obrigatória quando o provedor ativo for `gemini`. |
| `GEMINI_MODEL` | Opcional | `"gemini-3.8-flash"` | Nome do modelo do Google Gemini (>= `gemini-3.8-flash`). |

## 4. Contrato HTTP Público (`POST /consultar-peca`)

Permanece 100% compatível com a v2.0:
- **200 OK**: `ConsultaResponse` (`status`, `pecas_encontradas`, `resposta`)
- **422 Unprocessable Entity**: Validação de entrada Pydantic v2
- **502 Bad Gateway**: `{"detail": "Erro de comunicação com o provedor de IA (deepseek|gemini): ..."}`
- **504 Gateway Timeout**: `{"detail": "Timeout ao aguardar resposta do provedor de IA (deepseek|gemini)."}`
- **500 Internal Server Error**: Erro interno ou falha no SQLite
