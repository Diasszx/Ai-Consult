---
description: "Task list for Minimalist AI Sales Counter Frontend (React + TypeScript + Tailwind + shadcn/ui)"
---

# Tasks: Sistema Web Minimalista de Balcão de Vendas AI-First

**Input**: Design documents from `/specs/003-sales-counter-frontend/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/ui-api-contract.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `autoparts-ai/main.py`
- **Frontend root**: `autoparts-web/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Vite + React + TypeScript + Tailwind CSS project and configure CORS in FastAPI

- [x] T001 Enable `CORSMiddleware` in `autoparts-ai/main.py` allowing frontend origins (`*` / `http://localhost:5173`, `http://127.0.0.1:5173`)
- [x] T002 Create frontend project scaffold (`package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.env.example`) in `autoparts-web/`
- [x] T003 [P] Create global minimalist theme stylesheet (`autoparts-web/src/index.css`) and utility helpers `cn()` in `autoparts-web/src/lib/utils.ts` and BRL currency formatter in `autoparts-web/src/lib/formatters.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core TypeScript domain types, Zod schema, API service layer, and reusable `shadcn/ui` primitives

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Define strict TypeScript contracts (`ConsultaRequest`, `PecaERP`, `ConsultaResponse`, `InteracaoConsulta`, `ItemOrcamento`, `ApiError`) in `autoparts-web/src/types/autoparts.ts`
- [x] T005 [P] Define Zod validation schema `consultaSchema` (`trim()`, `min(3)`, `max(500)`) in `autoparts-web/src/schemas/consultaSchema.ts`
- [x] T006 [P] Implement `autopartsService.ts` (`consultarPeca`) with `AbortController` timeout and HTTP status mapping (`422`, `502`, `504`, `500`) in `autoparts-web/src/services/autopartsService.ts`
- [x] T007 [P] Create reusable minimalist `shadcn/ui` primitives (`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `skeleton.tsx`, `alert.tsx`) in `autoparts-web/src/components/ui/`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Central de Consulta Inteligente com IA como Protagonista do Balcão (Priority: P1) 🎯 MVP

**Goal**: Entregar a Central de Consulta com IA minimalista como protagonista da tela, com input validado por React Hook Form + Zod, resposta direta da IA em destaque e mini-cards de peças (`PecaActionCard`) integrados.

**Independent Test**: Submeter uma pergunta na barra central da IA, visualizar o skeleton de loading e, ao concluir, ver a resposta direta da IA e os mini-cards das peças encontradas com badge de estoque e preço formatado.

### Implementation for User Story 1

- [x] T008 [P] [US1] Implement `PecaActionCard` component displaying SKU (with copy button), `nome_peca`, semantic stock `Badge`, BRL price, and `+ Orçamento` button in `autoparts-web/src/components/PecaActionCard.tsx`
- [x] T009 [P] [US1] Implement `AiSearchForm` component using `react-hook-form` and `zodResolver(consultaSchema)` with minimalist command-bar aesthetic in `autoparts-web/src/components/AiSearchForm.tsx`
- [x] T010 [US1] Implement `AiConsultationFeed` component rendering the AI response in focus along with attached `PecaActionCard` items and loading skeletons in `autoparts-web/src/components/AiConsultationFeed.tsx`

**Checkpoint**: User Story 1 (AI-First Consultation) is functional

---

## Phase 4: User Story 2 - Montagem de Orçamento Rápido Integrado às Respostas da IA (Priority: P2)

**Goal**: Permitir adicionar peças em estoque diretamente dos cards da resposta da IA para um painel minimalista de orçamento rápido, respeitando o limite físico do ERP e copiando o resumo.

**Independent Test**: Clicar em `+ Orçamento` em uma peça disponível, ajustar quantidade até o teto do estoque, conferir o total em `R$` e clicar em `"Copiar Orçamento"`.

### Implementation for User Story 2

- [x] T011 [P] [US2] Implement `useOrcamento` hook with `localStorage` persistence, stock ceiling guard (`estoqueMaximo`), subtotal/total calculation, and clipboard summary formatter in `autoparts-web/src/hooks/useOrcamento.ts`
- [x] T012 [US2] Implement minimalist collapsible `QuoteSummaryPanel` component in `autoparts-web/src/components/QuoteSummaryPanel.tsx`

**Checkpoint**: User Stories 1 and 2 work together seamlessly

---

## Phase 5: User Story 3 & User Story 4 - Sugestões Rápidas, Histórico da Sessão e Tratamento de Erros Semânticos (Priority: P3/P4)

**Goal**: Adicionar chips de sugestões rápidas no estado vazio, histórico de consultas da sessão e alertas semânticos de erro com botão `"Tentar Novamente"`, integrando tudo no `App.tsx`.

**Independent Test**: Clicar em um chip de sugestão no estado vazio; simular erro 502/504 e clicar em `"Tentar Novamente"`; alternar entre consultas feitas na sessão.

### Implementation for User Stories 3 & 4

- [x] T013 [US3] Integrate quick-prompt suggestion chips, session history switcher, semantic `Alert` error state with retry action, and minimalist header into `autoparts-web/src/App.tsx` and `autoparts-web/src/main.tsx`

**Checkpoint**: Complete Minimalist AI Sales Counter application assembled

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Install dependencies, verify TypeScript strict compilation and production build

- [x] T014 Install npm packages in `autoparts-web/`, run TypeScript typecheck (`tsc --noEmit`), production build (`npm run build`), and backend `pytest` suite
