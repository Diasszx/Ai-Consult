---
description: "Task list for AutoParts AI & ERP Integrator implementation"
---

# Tasks: AutoParts AI & ERP Integrator (v2.0)

**Input**: Design documents from `/specs/001-autoparts-ai-erp/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Project root**: `autoparts-ai/`
- **Files**: `autoparts-ai/main.py`, `autoparts-ai/schemas.py`, `autoparts-ai/database.py`, `autoparts-ai/agent.py`, `autoparts-ai/requirements.txt`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency declarations

- [x] T001 Create project directory structure `autoparts-ai/` per implementation plan
- [x] T002 Create `autoparts-ai/requirements.txt` with `fastapi>=0.115.0`, `uvicorn>=0.30.0`, `pydantic>=2.9.0`, `google-genai>=1.0.0`, and `python-dotenv>=1.0.1`
- [x] T003 [P] Create `.env.example` in `autoparts-ai/.env.example` documenting `GEMINI_API_KEY`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure (database, catalog, and base schemas) that MUST be complete before user stories can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Define Pydantic v2 contracts `ConsultaRequest` (`min_length=3`, `max_length=500`, `str_strip_whitespace=True`), `PecaERP` (`sku: str`, `nome_peca: str`, `em_estoque: bool`, `preco: float | None = None`, `quantidade: int | None = None`), and `ConsultaResponse` (`status: str = "sucesso"`, `pecas_encontradas: list[PecaERP]`, `resposta: str`) in `autoparts-ai/schemas.py`
- [x] T005 [P] Implement `CATALOGO_TECNICO` dictionary (`AMOR-G5-01`, `AMOR-G5-02`, `PAST-CIV-10`, `FILT-COR-15`, `VELA-UNO-11`) and SQLite connection context manager `get_db_connection()` (`timeout=10.0`, `sqlite3.Row`) in `autoparts-ai/database.py`
- [x] T006 Implement `init_db()` with `estoque_erp` table (`sku TEXT PRIMARY KEY`, `preco REAL NOT NULL`, `quantidade INT NOT NULL`) and idempotent seed data (`INSERT OR IGNORE`) plus `consultar_skus_no_sqlite(skus: list[str])` parameterized `WHERE sku IN (...)` query in `autoparts-ai/database.py`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Consulta de Estoque e Preço com Retorno Estruturado e Conversacional (Priority: P1) 🎯 MVP

**Goal**: Permitir consultas em linguagem natural sobre autopeças e retornar tanto a lista estruturada de peças (`pecas_encontradas`) auditada diretamente do SQLite quanto a síntese comercial redigida pelo Gemini (`resposta`).

**Independent Test**: Enviar `POST /consultar-peca` com `{"pergunta": "Preciso do amortecedor dianteiro do Gol G5 2012 1.0, tem no estoque?"}` e validar retorno HTTP 200 contendo `AMOR-G5-01`, `em_estoque: true`, `preco: 250.0`, `quantidade: 12` e resposta textual formatada em R$.

### Implementation for User Story 1

- [x] T007 [US1] Implement `_montar_system_prompt()` injecting `CATALOGO_TECNICO` JSON, scope guardrail rules, and formatting instructions in `autoparts-ai/agent.py`
- [x] T008 [US1] Implement `processar_consulta_agente(pergunta: str)` with `genai.Client` (`timeout=15000`), `gemini-2.5-flash` (`temperature=0.0`), request-scoped `pecas_capturadas` buffer, and `buscar_dados_erp(skus: list[str])` closure for exact match lookup in `autoparts-ai/agent.py`
- [x] T009 [US1] Implement FastAPI application with `lifespan` (`load_dotenv()`, fail-fast `GEMINI_API_KEY` check, `init_db()`) and synchronous route `def consultar_peca(payload: ConsultaRequest) -> ConsultaResponse` at `POST /consultar-peca` in `autoparts-ai/main.py`

**Checkpoint**: At this point, User Story 1 (MVP) is functional and independently testable

---

## Phase 4: User Story 2 - Resolução de Perguntas Ambíguas com Múltiplas Peças (Priority: P2)

**Goal**: Garantir que perguntas genéricas (ex: sem especificar eixo dianteiro ou traseiro) identifiquem todos os SKUs compatíveis no catálogo, consultem o ERP em lote e retornem itens com e sem estoque (`em_estoque=True` e `em_estoque=False`).

**Independent Test**: Enviar `POST /consultar-peca` com `{"pergunta": "Tem amortecedor pro Gol G5 2011?"}` e verificar se `pecas_encontradas` retorna `AMOR-G5-01` (`em_estoque: true`, `quantidade: 12`) e `AMOR-G5-02` (`em_estoque: false`, `quantidade: 0`).

### Implementation for User Story 2

- [x] T010 [US2] Refine multi-SKU normalization (`[s.strip().upper() for s in skus if s.strip()]`), zero-stock evaluation (`em_estoque = qtd > 0`), and multi-item prompt instructions in `autoparts-ai/agent.py`

**Checkpoint**: User Stories 1 and 2 work independently and handle single or multiple SKUs

---

## Phase 5: User Story 3 - Conflito de Cadastro entre Catálogo Técnico e ERP (Priority: P3)

**Goal**: Tratar de forma transparente e sem erros os casos em que o SKU existe no `CATALOGO_TECNICO` mas não possui registro na tabela `estoque_erp` do SQLite.

**Independent Test**: Enviar `POST /consultar-peca` com `{"pergunta": "Quanto tá o jogo de vela do Novo Uno 2012 Fire Evo?"}` e validar que `pecas_encontradas` inclui `VELA-UNO-11` com `em_estoque: false`, `preco: null`, `quantidade: null` e texto explicativo.

### Implementation for User Story 3

- [x] T011 [US3] Implement fallback branch in `buscar_dados_erp` closure when `registro_erp` is `None`, setting `PecaERP(sku=sku, nome_peca=nome_peca, em_estoque=False, preco=None, quantidade=None)` and returning `cadastrado_no_erp: False` message to the LLM in `autoparts-ai/agent.py`

**Checkpoint**: Catalog vs. ERP conflict scenarios are safely handled without hallucination or crashes

---

## Phase 6: User Story 4 - Validação de Entrada e Tratamento Específico de Erros HTTP (Priority: P4)

**Goal**: Mapear falhas de validação e exceções de infraestrutura em códigos HTTP semânticos (`422`, `502`, `504`, `500`) com mensagens padronizadas.

**Independent Test**: Enviar payload `{"pergunta": "Oi"}` e verificar retorno HTTP 422; verificar que timeouts de IA mapeiam para 504, falhas da API Gemini mapeiam para 502 e erros de SQLite mapeiam para 500.

### Implementation for User Story 4

- [x] T012 [US4] Implement exception handling in `POST /consultar-peca` mapping `httpx.TimeoutException` to HTTP 504, `google.genai.errors.APIError` to HTTP 502, `sqlite3.Error` to HTTP 500, and generic `Exception` to HTTP 500 in `autoparts-ai/main.py`

**Checkpoint**: All user stories (P1-P4) and error contracts are complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and readiness checks across all scenarios

- [x] T013 [P] Create automated integration/contract test suite covering Scenarios 1-5 and error mappings in `autoparts-ai/test_main.py`
- [x] T014 Run validation scenarios defined in `specs/001-autoparts-ai-erp/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3 to Phase 6)**: Depend on Foundational phase completion
  - US1 (P1) establishes the core agent & endpoint flow
  - US2 (P2) and US3 (P3) refine the closure and prompt behavior in `autoparts-ai/agent.py`
  - US4 (P4) hardens error boundaries in `autoparts-ai/main.py`
- **Polish (Phase 7)**: Depends on all user stories being complete

### Parallel Opportunities

- **Phase 1**: `T002` (`requirements.txt`) and `T003` (`.env.example`) can run in parallel after `T001`.
- **Phase 2**: `T004` (`autoparts-ai/schemas.py`) and `T005`/`T006` (`autoparts-ai/database.py`) operate on separate files and can be executed in parallel.
- **Phase 6 & Phase 5**: `T011` (`autoparts-ai/agent.py`) and `T012` (`autoparts-ai/main.py`) touch distinct files and can be executed in parallel after `T009`.

---

## Parallel Example: Foundational Phase (Phase 2)

```bash
# Run schemas and database creation in parallel:
Task T004: "Define Pydantic v2 contracts ConsultaRequest, PecaERP, and ConsultaResponse in autoparts-ai/schemas.py"
Task T005: "Implement CATALOGO_TECNICO and SQLite connection context manager in autoparts-ai/database.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`–`T003`)
2. Complete Phase 2: Foundational (`T004`–`T006`)
3. Complete Phase 3: User Story 1 (`T007`–`T009`)
4. **STOP and VALIDATE**: Test exact match query (`AMOR-G5-01`) end-to-end

### Incremental Delivery

1. Setup + Foundational → Data layer and contracts ready
2. Add User Story 1 (P1) → Core RAG + Function Calling + Closure working (MVP!)
3. Add User Story 2 (P2) → Multi-SKU ambiguity resolution working
4. Add User Story 3 (P3) → Missing ERP record resilience working
5. Add User Story 4 (P4) → Full HTTP 422/502/504/500 error handling working
6. Polish (Phase 7) → Automated tests and quickstart verification
