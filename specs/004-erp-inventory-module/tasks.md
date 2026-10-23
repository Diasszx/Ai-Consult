---
description: "Task list for Navegação Lateral e Módulo de Gestão de Estoque ERP Sincronizado com IA"
---

# Tasks: Navegação Lateral e Módulo de Gestão de Estoque ERP Sincronizado com IA

**Input**: Design documents from `/specs/004-erp-inventory-module/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/inventory-api-contract.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup & Foundational (Contracts & UI Primitives)

**Purpose**: Core Pydantic v2 schemas, TypeScript contracts, Zod schema, and `shadcn/ui` Table & Dialog primitives

- [x] T001 [P] Add `EstoqueItemResponse`, `EstoqueCreateRequest`, and `EstoqueUpdateRequest` Pydantic v2 models in `autoparts-ai/schemas.py`
- [x] T002 [P] Add `ModuloAtivo`, `EstoqueItem`, `EstoqueCreateInput`, and `EstoqueUpdateInput` TypeScript interfaces in `autoparts-web/src/types/autoparts.ts`
- [x] T003 [P] Create Zod validation schema `estoqueItemSchema` (`sku`, `nome_peca`, `marca`, `aplicacao`, `preco >= 0`, `quantidade >= 0`) in `autoparts-web/src/schemas/estoqueSchema.ts`
- [x] T004 [P] Create reusable minimalist `shadcn/ui` primitives `table.tsx` and `dialog.tsx` in `autoparts-web/src/components/ui/`

---

## Phase 2: User Story 2 & User Story 3 - Persistência SQLite, Endpoints CRUD `/estoque` e Sincronização com IA (Priority: P1)

**Goal**: Persistir o catálogo e o estoque no SQLite, expor `GET/POST/PUT/DELETE /estoque` e fazer o agente de IA ler o catálogo dinâmico do banco a cada consulta.

**Independent Test**: Criar, editar ou excluir um item em `/estoque` e consultar a IA em `/consultar-peca`, verificando que a IA reconhece imediatamente as alterações.

### Implementation for Backend & AI Sync

- [x] T005 [US2] Update `init_db()` in `autoparts-ai/database.py` to create and seed `catalogo_pecas` alongside `estoque_erp`, and implement `obter_catalogo_atual()`, `listar_itens_estoque()`, `criar_item_estoque()`, `atualizar_item_estoque()`, and `excluir_item_estoque()`
- [x] T006 [US3] Update `_montar_system_prompt()` and `buscar_dados_erp()` in `autoparts-ai/agent.py` to query `obter_catalogo_atual()` dynamically from SQLite on every consultation
- [x] T007 [US2] Implement `GET /estoque`, `POST /estoque` (201/409), `PUT /estoque/{sku}` (200/404), and `DELETE /estoque/{sku}` (200/404) routes in `autoparts-ai/main.py`

---

## Phase 3: User Story 1 & User Story 2 (Frontend) - Barra Lateral Minimalista e Módulo de Estoque ERP (Priority: P1)

**Goal**: Adicionar a Sidebar minimalista (`Consulta`, `Estoque`, `Orçamentos`) com `Consulta` como tela inicial padrão, e construir a tela `InventoryView` com tabela ERP, busca, adição, edição e exclusão.

**Independent Test**: Navegar entre `Consulta`, `Estoque` e `Orçamentos` na Sidebar; criar, editar e excluir peças na tabela do módulo `Estoque`.

### Implementation for Frontend Sidebar & Inventory CRUD

- [x] T008 [P] [US2] Add `listarEstoque()`, `criarItemEstoque()`, `atualizarItemEstoque()`, and `excluirItemEstoque()` functions in `autoparts-web/src/services/autopartsService.ts`
- [x] T009 [P] [US1] Implement `AppSidebar` component with navigation items `Consulta`, `Estoque`, and `Orçamentos` in `autoparts-web/src/components/AppSidebar.tsx`
- [x] T010 [P] [US1] Implement `BudgetsPlaceholderView` component for the `Orçamentos` sidebar tab in `autoparts-web/src/components/BudgetsPlaceholderView.tsx`
- [x] T011 [P] [US2] Implement `InventoryFormModal` component using `react-hook-form` and `zodResolver(estoqueItemSchema)` for creating and editing inventory items in `autoparts-web/src/components/InventoryFormModal.tsx`
- [x] T012 [US2] Implement `InventoryView` component with ERP `Table`, search filter, status badges, and create/edit/delete actions in `autoparts-web/src/components/InventoryView.tsx`
- [x] T013 [US1] Update `autoparts-web/src/App.tsx` to integrate `AppSidebar` with `"consulta"` as the default active view (`moduloAtivo`), rendering `Consulta` (AI chat), `Estoque` (`InventoryView`), or `Orçamentos` (`BudgetsPlaceholderView`)

---

## Phase 4: Polish & Validation

**Purpose**: Automated backend tests for CRUD + AI sync and frontend TypeScript production build

- [x] T014 Add automated tests in `autoparts-ai/test_main.py` covering `GET/POST/PUT/DELETE /estoque`, duplicate SKU 409, and real-time AI synchronization after inventory changes
- [x] T015 Run `pytest -v` in `autoparts-ai/` and `npm run build` (`tsc --noEmit && vite build`) in `autoparts-web/`
