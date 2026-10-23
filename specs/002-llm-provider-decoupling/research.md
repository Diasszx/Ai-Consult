# Phase 0: Research & Technical Decisions - Desacoplamento e Injeção de Dependência do Provedor de IA

## Decision 1: Padrão Arquitetural para Desacoplamento (Strategy + Adapter + Dependency Injection)
- **Decisão**: Criar o módulo `llm_providers.py` contendo o contrato abstrato `LLMProvider` (`typing.Protocol` / `ABC`), as implementações concretas `DeepSeekProvider` e `GeminiProvider`, as exceções de domínio (`LLMProviderError`, `LLMTimeoutError`) e a factory de injeção `get_llm_provider()`. Na rota `POST /consultar-peca` (`main.py`), injetar o provedor via `Depends(get_llm_provider)` do FastAPI e repassá-lo para `processar_consulta_agente(pergunta, provider)`.
- **Justificativa**: Aplica diretamente o princípio **D** do SOLID (Dependency Inversion Principle). Nem `main.py` nem `agent.py` conhecem detalhes de endpoints, headers, formatos de payload ou SDKs da DeepSeek ou do Gemini. Para trocar de IA, basta alterar a variável `LLM_PROVIDER` (ou a função factory), e para testar basta injetar um `FakeProvider` via `app.dependency_overrides[get_llm_provider]`.
- **Alternativas consideradas**:
  - `if/else` dentro de `agent.py`: Rejeitado por violar o Open-Closed Principle (OCP) e manter o acoplamento com múltiplos SDKs dentro da camada de negócio.
  - Frameworks pesados como LangChain / LiteLLM: Rejeitado por adicionar dezenas de dependências transitivas pesadas para um fluxo enxuto de 1 tool call.

## Decision 2: Integração com a API da DeepSeek e Ciclo de Tool Calling
- **Decisão**: Implementar `DeepSeekProvider` utilizando `httpx.Client` (já presente no projeto) apontando para a API oficial compatível com OpenAI (`https://api.deepseek.com/chat/completions`, modelo padrão `deepseek-chat`, `temperature=0.0`, `timeout=15.0`).
- **Justificativa**:
  - A API da DeepSeek utiliza o protocolo Chat Completions (`POST /chat/completions`).
  - Diferente do SDK do Gemini (que executa a função Python internamente de forma implícita), o protocolo da DeepSeek funciona em **2 etapas explícitas**:
    1. Envia `messages` (`system` + `user`) e a definição JSON Schema da tool `buscar_dados_erp`.
    2. Se o modelo retornar `finish_reason == "tool_calls"` (ou `message.tool_calls` preenchido), o `DeepSeekProvider` extrai a lista `skus` do JSON `function.arguments`, executa a closure `buscar_dados_erp(skus)` (que já popula `pecas_capturadas` diretamente do SQLite), anexa a resposta com `role: "tool"` e `tool_call_id`, e faz a segunda chamada para obter a resposta comercial final em português.
  - O uso direto do `httpx` evita instalar pacotes extras e garante controle absoluto sobre o timeout de 15 segundos e códigos de erro HTTP.
- **Alternativas consideradas**:
  - Adicionar dependência do SDK `openai`: Funciona, mas internamente o SDK `openai` é apenas um wrapper sobre `httpx`. Usar `httpx` diretamente mantém o `requirements.txt` enxuto, rápido e sem conflitos de versão.

## Decision 3: Preservação do Closure Pattern Anti-Alucinação (`agent.py`)
- **Decisão**: Manter a criação do buffer `pecas_capturadas: dict[str, PecaERP]` e da closure `buscar_dados_erp(skus: list[str]) -> list[dict]` dentro de `processar_consulta_agente(pergunta: str, provider: LLMProvider)`, passando a closure como callback (`tool_fn`) para `provider.gerar_resposta(system_prompt, pergunta, buscar_dados_erp)`.
- **Justificativa**: Garante que a regra de ouro do negócio (zero alucinação nos metadados numéricos de `pecas_encontradas`) funcione exatamente igual em **qualquer provedor de IA** (DeepSeek, Gemini ou futuros), pois quem popula `pecas_capturadas` é a função Python ao consultar o SQLite, não o texto livre da LLM.

## Decision 4: Exceções Agnósticas de Domínio (`LLMProviderError` e `LLMTimeoutError`)
- **Decisão**: Definir duas exceções de domínio em `llm_providers.py`:
  - `LLMTimeoutError`: Lançada quando qualquer provedor excede o limite de 15 segundos -> mapeada em `main.py` para **HTTP 504 Gateway Timeout**.
  - `LLMProviderError`: Lançada quando qualquer provedor falha por autenticação, cota, sobrecarga ou erro de comunicação -> mapeada em `main.py` para **HTTP 502 Bad Gateway**.
- **Justificativa**: Remove completamente `from google.genai import errors as genai_errors` do `main.py`, tornando a camada HTTP 100% agnóstica ao fornecedor.

## Decision 5: Configuração e Fail-Fast Inteligente por Provedor
- **Decisão**:
  - Variável `LLM_PROVIDER`: aceita `"deepseek"` ou `"gemini"`. Se não definida explicitamente, detecta automaticamente `"deepseek"` caso `DEEPSEEK_API_KEY` esteja definida, ou `"gemini"` caso `GEMINI_API_KEY` esteja definida.
  - Na inicialização (`lifespan`), valida a configuração do provedor ativo via `validar_configuracao_llm()`, falhando imediatamente (`RuntimeError`) se a chave do provedor selecionado estiver ausente ou se o nome do provedor for inválido.
