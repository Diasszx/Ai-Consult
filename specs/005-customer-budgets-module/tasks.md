---
description: "Task list for feature 005-customer-budgets-module"
---

# Tasks: Módulo de Orçamentos por Cliente (Customer Budgets ERP Module)

**Input**: Design documents from `/specs/005-customer-budgets-module/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/budgets-api-contract.md](./contracts/budgets-api-contract.md)

**Tests**: Incluídos na Fase Final para validar persistência no SQLite, aprovação com baixa automática no `estoque_erp` e conflito `409 Conflict` em `autoparts-ai/test_main.py`, além do build estrito do frontend TypeScript.

**Organization**: Tarefas agrupadas por User Story (`US1`, `US2`, `US3`) para entrega independente, incremental e testável.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode ser executada em paralelo (arquivos independentes)
- **[Story]**: User Story correspondente (`[US1]`, `[US2]`, `[US3]`)
- Caminhos exatos de arquivos incluídos em todas as tarefas

---

## Phase 1: Setup (Shared Infrastructure & Types)

**Purpose**: Definição dos contratos de dados no Backend (Pydantic v2) e Frontend (TypeScript + Zod) para Orçamentos por Cliente.

- [X] T001 [P] Adicionar os modelos Pydantic `OrcamentoItemInput` (`sku: min_length=2, max_length=40`, `nome_peca: min_length=2, max_length=150`, `preco_unitario: ge=0.0`, `quantidade: ge=1`), `OrcamentoCreateRequest` (`cliente_nome: min_length=2, max_length=120`, `cliente_telefone: min_length=8, max_length=30`, `cliente_veiculo: default="", max_length=120`, `observacoes: default="", max_length=300`, `itens: min_length=1`), `OrcamentoStatusUpdateRequest` (`status: Literal["pendente", "aprovado", "cancelado"]`), `OrcamentoItemResponse` e `OrcamentoResponse` em `autoparts-ai/schemas.py`
- [X] T002 [P] Adicionar as interfaces estritas `StatusOrcamento`, `OrcamentoItemSalvo`, `OrcamentoCliente` e `OrcamentoCreatePayload` em `autoparts-web/src/types/autoparts.ts`
- [X] T003 [P] Criar o schema de validação Zod `confirmarOrcamentoSchema` (`cliente_nome` mín. 2 e máx. 120 chars, `cliente_telefone` mín. 8 e máx. 30 chars, `cliente_veiculo` opcional máx. 120 chars, `observacoes` opcional máx. 300 chars) e o tipo inferido `ConfirmarOrcamentoFormValues` em `autoparts-web/src/schemas/orcamentoSchema.ts`

---

## Phase 2: Foundational (Database Persistence & API Client Layer)

**Purpose**: Persistência relacional SQLite (`orcamentos` e `orcamento_itens`) e funções de serviço HTTP no frontend.

**⚠️ CRITICAL**: Pré-requisito bloqueante para as User Stories de UI e integração.

- [X] T004 Atualizar `init_db()` para criar as tabelas `orcamentos` (`id`, `cliente_nome`, `cliente_telefone`, `cliente_veiculo`, `observacoes`, `status`, `valor_total`, `criado_em`) e `orcamento_itens` (`id`, `orcamento_id`, `sku`, `nome_peca`, `preco_unitario`, `quantidade`, `subtotal`) e implementar as funções `criar_orcamento()`, `listar_orcamentos()`, `atualizar_status_orcamento()` (com baixa atômica em `estoque_erp` ao aprovar e erro `SALDO_INSUFICIENTE` se faltar saldo) e `excluir_orcamento()` em `autoparts-ai/database.py`
- [X] T005 [P] Adicionar as funções `criarOrcamento()`, `listarOrcamentos()`, `atualizarStatusOrcamento()` e `excluirOrcamento()` na camada de serviços HTTP em `autoparts-web/src/services/autopartsService.ts`

**Checkpoint**: Camada de banco de dados SQLite e cliente HTTP prontos.

---

## Phase 3: User Story 1 - Confirmação de Orçamento com Identificação do Cliente (Priority: P1) 🎯 MVP

**Goal**: Permitir que, ao selecionar peças com `+ Orçar` e clicar em **"Confirmar Orçamento"**, o sistema abra um modal solicitando os dados do cliente (**Nome**, **Telefone/WhatsApp**, **Veículo/Placa**, **Observações**), valide com React Hook Form + Zod e grave o orçamento por cliente no banco SQLite via `POST /orcamentos`.

**Independent Test**: Adicionar uma peça ao rascunho na tela `Consulta`, clicar em **"Confirmar Orçamento"**, preencher `Nome: Carlos Mendes` e `Telefone: (11) 98765-4321`, confirmar e verificar que o orçamento é salvo no SQLite (`201 Created`) e o rascunho é limpo.

### Implementation for User Story 1

- [X] T006 [US1] Implementar o endpoint `POST /orcamentos` (`201 Created`) em `autoparts-ai/main.py`
- [X] T007 [P] [US1] Criar o componente modal `ConfirmBudgetModal` com React Hook Form + `zodResolver(confirmarOrcamentoSchema)`, resumo de itens/total e campos `cliente_nome`, `cliente_telefone`, `cliente_veiculo` e `observacoes` em `autoparts-web/src/components/ConfirmBudgetModal.tsx`
- [X] T008 [US1] Atualizar o painel `QuoteSummaryPanel` para incluir o botão primário `"Confirmar Orçamento"` (que aciona a abertura do modal de dados do cliente) em `autoparts-web/src/components/QuoteSummaryPanel.tsx`

**Checkpoint**: O vendedor já consegue confirmar um orçamento informando os dados do cliente e salvá-lo no banco de dados.

---

## Phase 4: User Story 2 - Gestão e Consulta de Orçamentos por Cliente na Aba "Orçamentos" (Priority: P1)

**Goal**: Exibir na aba **Orçamentos** da barra lateral todos os orçamentos salvos organizados por cliente, com busca instantânea por Nome, Telefone, Veículo ou código (`#ORC-...`), detalhamento das peças e cópia de proposta personalizada para WhatsApp.

**Independent Test**: Clicar em `Orçamentos` na barra lateral, buscar pelo nome do cliente, visualizar os itens do orçamento e clicar em `"Copiar Proposta"` para obter o texto formatado com os dados do cliente.

### Implementation for User Story 2

- [X] T009 [US2] Implementar o endpoint `GET /orcamentos` (`200 OK`) retornando todos os orçamentos com seus itens em `autoparts-ai/main.py`
- [X] T010 [P] [US2] Criar a visão `BudgetsView` com KPIs de orçamentos, barra de busca por cliente/telefone/veículo/código, cards detalhados por cliente e botão de copiar proposta personalizada para WhatsApp em `autoparts-web/src/components/BudgetsView.tsx`
- [X] T011 [US2] Integrar `ConfirmBudgetModal` e `BudgetsView` ao `App.tsx`, limpando o rascunho e redirecionando para a aba `"orcamentos"` após confirmar um orçamento em `autoparts-web/src/App.tsx`

**Checkpoint**: Os orçamentos confirmados aparecem imediatamente na aba `Orçamentos` com busca por cliente e cópia para WhatsApp.

---

## Phase 5: User Story 3 - Ciclo de Vida do Orçamento (Aprovação com Baixa de Estoque, Cancelamento e Exclusão) (Priority: P2)

**Goal**: Permitir aprovar um orçamento (descontando automaticamente as quantidades em `estoque_erp` no SQLite, ou exibindo alerta caso o estoque seja insuficiente), cancelar ou excluir orçamentos na tela `BudgetsView`.

**Independent Test**: Clicar em `"Aprovar"` em um orçamento pendente e verificar que o status muda para `Aprovado` e o saldo das peças é reduzido tanto na aba `Estoque` quanto nas consultas da IA.

### Implementation for User Story 3

- [X] T012 [US3] Implementar os endpoints `PATCH /orcamentos/{orcamento_id}/status` (retornando `200 OK`, `404 Not Found` ou `409 Conflict` quando faltar saldo no estoque) e `DELETE /orcamentos/{orcamento_id}` em `autoparts-ai/main.py`
- [X] T013 [US3] Adicionar as ações de **Aprovar (Baixar Estoque)**, **Cancelar** e **Excluir** com feedback de loading e tratamento de erro `409 Conflict` em `autoparts-web/src/components/BudgetsView.tsx`

**Checkpoint**: Ciclo de vida completo do orçamento integrado ao estoque físico e à IA.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Testes automatizados de integração e validação de build.

- [X] T014 Adicionar testes automatizados (`test_orcamento_por_cliente_aprovar_baixa_estoque_e_conflito_409`) em `autoparts-ai/test_main.py`
- [X] T015 Executar `pytest -v` em `autoparts-ai/` e `npm run build` (`tsc --noEmit && vite build`) em `autoparts-web/` para validar 100% dos critérios de sucesso
