---
description: "Task list for Desacoplamento e Injeção de Dependência do Provedor de IA (DeepSeek / Gemini)"
---

# Tasks: Desacoplamento e Injeção de Dependência do Provedor de IA (DeepSeek / Gemini)

**Input**: Design documents from `/specs/002-llm-provider-decoupling/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/llm-provider-contract.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project root**: `autoparts-ai/`
- **Files**: `autoparts-ai/llm_providers.py`, `autoparts-ai/agent.py`, `autoparts-ai/main.py`, `autoparts-ai/.env.example`, `autoparts-ai/test_main.py`

---

## Phase 1: Setup (Shared Configuration)

**Purpose**: Environment variable documentation and provider configuration preparation

- [x] T001 [P] Update `autoparts-ai/.env.example` with `LLM_PROVIDER`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `GEMINI_API_KEY`, and `GEMINI_MODEL`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core abstraction (`LLMProvider` Protocol), domain exceptions, and concrete adapters in `autoparts-ai/llm_providers.py`

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Create `ToolCallback`, `LLMProvider` (`Protocol` with `gerar_resposta(self, system_prompt: str, pergunta: str, buscar_dados_erp: ToolCallback) -> str`), and domain exceptions `LLMProviderError` and `LLMTimeoutError` in `autoparts-ai/llm_providers.py`
- [x] T003 Implement `GeminiProvider` in `autoparts-ai/llm_providers.py` encapsulating `google.genai.Client` (`model="gemini-3.8-flash"`, `temperature=0.0`, `timeout=15000`), exponential backoff retry on 503/429, and exception translation to `LLMTimeoutError` / `LLMProviderError`

**Checkpoint**: Base abstraction and legacy Gemini adapter isolated in `autoparts-ai/llm_providers.py`

---

## Phase 3: User Story 1 - Consulta de Autopeças Utilizando o Provedor DeepSeek (Priority: P1) 🎯 MVP

**Goal**: Implementar o adaptador concreto `DeepSeekProvider` suportando a API `/chat/completions` da DeepSeek com `temperature=0.0`, `timeout=15.0` e o ciclo completo de Tool Calling em 2 etapas acionando a closure `buscar_dados_erp(skus)`.

**Independent Test**: Instanciar `DeepSeekProvider`, processar uma pergunta em `processar_consulta_agente` e validar que o 1º request envia o JSON Schema da tool `buscar_dados_erp`, executa o callback local preenchendo `pecas_capturadas` do SQLite e envia o 2º request com `role="tool"` retornando a resposta comercial final.

### Implementation for User Story 1

- [x] T004 [US1] Implement `DeepSeekProvider` in `autoparts-ai/llm_providers.py` with OpenAI-compatible tool schema for `buscar_dados_erp(skus: list[str])`, 2-step `tool_calls` execution loop via `httpx.Client(timeout=15.0)`, `temperature=0.0`, retry on 429/503, and translation of `httpx.TimeoutException` / HTTP errors to `LLMTimeoutError` and `LLMProviderError`

**Checkpoint**: `DeepSeekProvider` is complete and ready to be injected

---

## Phase 4: User Story 2 - Troca Transparente de Provedor via Injeção de Dependência (Priority: P2)

**Goal**: Desacoplar `agent.py` e `main.py` de qualquer SDK específico, injetando `LLMProvider` via `Depends(get_llm_provider)` do FastAPI.

**Independent Test**: Alternar `LLM_PROVIDER` entre `"deepseek"` e `"gemini"` (ou injetar um `FakeProvider` via `app.dependency_overrides[get_llm_provider]`) sem tocar em `agent.py`, `main.py`, `schemas.py` ou `database.py`.

### Implementation for User Story 2

- [x] T005 [US2] Implement provider resolution factory `get_llm_provider() -> LLMProvider` in `autoparts-ai/llm_providers.py` supporting `LLM_PROVIDER` (`"deepseek"` or `"gemini"`, auto-detecting `"deepseek"` when `DEEPSEEK_API_KEY` is set)
- [x] T006 [US2] Refactor `processar_consulta_agente(pergunta: str, provider: LLMProvider | None = None) -> tuple[str, list[PecaERP]]` in `autoparts-ai/agent.py` to remove direct `google.genai` imports and delegate generation to `provider.gerar_resposta(_montar_system_prompt(), pergunta, buscar_dados_erp)` while preserving the `pecas_capturadas` closure
- [x] T007 [US2] Refactor `POST /consultar-peca` in `autoparts-ai/main.py` to inject `provider: LLMProvider = Depends(get_llm_provider)` and pass it to `processar_consulta_agente(payload.pergunta, provider)`

**Checkpoint**: Full Dependency Injection active across `main.py` -> `agent.py` -> `llm_providers.py`

---

## Phase 5: User Story 3 - Tratamento Agnóstico de Erros e Validação Fail-Fast por Provedor (Priority: P3)

**Goal**: Garantir que o startup (`lifespan`) valide a credencial do provedor ativo (`DEEPSEEK_API_KEY` ou `GEMINI_API_KEY`) e que a rota `POST /consultar-peca` traduza `LLMTimeoutError` para HTTP 504 e `LLMProviderError` para HTTP 502 de forma agnóstica.

**Independent Test**: Iniciar a app com `LLM_PROVIDER=deepseek` sem `DEEPSEEK_API_KEY` (deve falhar com `RuntimeError`); simular `LLMTimeoutError` (retorna 504) e `LLMProviderError` (retorna 502).

### Implementation for User Story 3

- [x] T008 [US3] Implement `validar_configuracao_llm() -> None` in `autoparts-ai/llm_providers.py` validating provider name (`deepseek` or `gemini`) and required API key (`DEEPSEEK_API_KEY` or `GEMINI_API_KEY`)
- [x] T009 [US3] Update `lifespan` and exception handlers in `autoparts-ai/main.py` to call `validar_configuracao_llm()` on startup and map `LLMTimeoutError` to HTTP 504 and `LLMProviderError` to HTTP 502 without importing `google.genai`

**Checkpoint**: Startup fail-fast and HTTP error boundaries are 100% provider-agnostic

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Automated test coverage for DeepSeek, Gemini, Dependency Injection, and error handling

- [x] T010 Update `autoparts-ai/test_main.py` to test `DeepSeekProvider` (2-step tool call loop, timeout 504, API error 502), `GeminiProvider`, FastAPI `Depends(get_llm_provider)` override, provider-specific fail-fast startup, and all 5 business scenarios
- [x] T011 Run full `pytest` suite in `autoparts-ai/` and verify all tests pass with zero regressions
