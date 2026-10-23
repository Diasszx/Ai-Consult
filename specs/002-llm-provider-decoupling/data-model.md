# Data Model & Architecture Entities: Desacoplamento de Provedor de IA

## 1. Contratos de Abstração e Injeção (`llm_providers.py`)

### `ToolCallback` (Type Alias)
Assinatura padronizada da closure de consulta ao ERP injetada no provedor de IA:
```python
ToolCallback = Callable[[list[str]], list[dict]]
```

---

### `LLMProvider` (`Protocol` / Interface Abstrata)
Contrato que todo motor de IA (DeepSeek, Gemini, OpenAI, Mock) deve implementar para ser injetado na aplicação.

| Método | Parâmetros | Retorno | Descrição |
|---|---|---|---|
| `gerar_resposta` | `system_prompt: str`, `pergunta: str`, `buscar_dados_erp: ToolCallback` | `str` | Executa o raciocínio do modelo, aciona `buscar_dados_erp(skus)` quando necessário e retorna a resposta comercial final. |

---

### `DeepSeekProvider` (Implementação Concreta)
Adaptador para a API da DeepSeek (`/chat/completions`).

| Atributo | Tipo | Padrão | Descrição |
|---|---|---|---|
| `api_key` | `str` | `os.getenv("DEEPSEEK_API_KEY")` | Chave de autenticação Bearer da DeepSeek |
| `model` | `str` | `"deepseek-chat"` | Modelo utilizado (`DEEPSEEK_MODEL`) |
| `base_url` | `str` | `"https://api.deepseek.com"` | Endpoint base da API (`DEEPSEEK_BASE_URL`) |
| `timeout` | `float` | `15.0` | Timeout rígido em segundos |

---

### `GeminiProvider` (Implementação Concreta)
Adaptador para o Google GenAI SDK.

| Atributo | Tipo | Padrão | Descrição |
|---|---|---|---|
| `api_key` | `str` | `os.getenv("GEMINI_API_KEY")` | Chave de API do Google AI Studio |
| `model` | `str` | `"gemini-3.8-flash"` | Modelo mínimo exigido pela Constituição (`GEMINI_MODEL`) |
| `timeout_ms` | `int` | `15000` | Timeout rígido em milissegundos (15s) |

---

### Exceções de Domínio Agnósticas

| Classe | Herança | Código HTTP em `main.py` | Quando é lançada |
|---|---|---|---|
| `LLMTimeoutError` | `Exception` | `504 Gateway Timeout` | Quando o provedor ativo (`deepseek` ou `gemini`) excede 15s |
| `LLMProviderError` | `Exception` | `502 Bad Gateway` | Quando o provedor ativo retorna erro de API (401, 402, 429, 500, 503) |

---

## 2. Diagrama de Arquitetura (Injeção de Dependência + Closure Pattern)

```mermaid
classDiagram
    class MainRoute {
        +POST /consultar-peca(payload, provider)
    }
    class AgentService {
        +processar_consulta_agente(pergunta, provider)
    }
    class LLMProvider {
        <<interface>>
        +gerar_resposta(system_prompt, pergunta, buscar_dados_erp) str
    }
    class DeepSeekProvider {
        +api_key: str
        +model: str
        +gerar_resposta(system_prompt, pergunta, buscar_dados_erp) str
    }
    class GeminiProvider {
        +api_key: str
        +model: str
        +gerar_resposta(system_prompt, pergunta, buscar_dados_erp) str
    }
    class DatabaseERP {
        +CATALOGO_TECNICO
        +consultar_skus_no_sqlite(skus)
    }

    MainRoute ..> LLMProvider : Injetado via Depends(get_llm_provider)
    MainRoute --> AgentService : repassa provider
    AgentService --> LLMProvider : chama gerar_resposta()
    AgentService --> DatabaseERP : closure buscar_dados_erp()
    DeepSeekProvider ..|> LLMProvider : implementa
    GeminiProvider ..|> LLMProvider : implementa
```

---

## 3. Fluxo de Execução do Tool Calling na DeepSeek

```mermaid
sequenceDiagram
    participant C as Cliente
    participant M as main.py (FastAPI)
    participant A as agent.py (Domínio)
    participant D as DeepSeekProvider
    participant DB as SQLite (database.py)

    C->>M: POST /consultar-peca (Depends -> DeepSeekProvider)
    M->>A: processar_consulta_agente(pergunta, provider)
    A->>D: gerar_resposta(system_prompt, pergunta, buscar_dados_erp)
    D->>D: 1ª chamada POST /chat/completions (com tool schema)
    Note over D: DeepSeek retorna tool_calls: buscar_dados_erp(skus)
    D->>A: executa callback buscar_dados_erp(skus)
    A->>DB: consultar_skus_no_sqlite(skus)
    DB-->>A: dados reais (preço e quantidade)
    Note over A: Popula buffer local pecas_capturadas
    A-->>D: retorna JSON dos itens do ERP
    D->>D: 2ª chamada POST /chat/completions (com role="tool")
    D-->>A: texto da resposta comercial final
    A-->>M: (texto_final, list(pecas_capturadas))
    M-->>C: 200 OK ConsultaResponse
```
