# Implementation Plan: Módulo de Orçamentos por Cliente (Customer Budgets ERP Module)

**Branch**: `005-customer-budgets-module` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-customer-budgets-module/spec.md`

## Summary

Implementar o **Módulo de Orçamentos por Cliente** ponta a ponta (SQLite + FastAPI + React/TypeScript/shadcn/ui). No balcão de consulta, ao clicar em **"Confirmar Orçamento"**, um modal validado com **React Hook Form + Zod** solicita os dados do cliente (**Nome**, **Telefone/WhatsApp**, **Veículo/Placa**, **Observações**) e grava o orçamento no banco SQLite. Na barra lateral, a aba **Orçamentos** passa a listar todos os orçamentos por cliente com busca rápida, cópia formatada de proposta comercial e aprovação com **baixa automática de estoque** no ERP.

## Technical Context

**Language/Version**:
- Backend: Python 3.10+ (FastAPI + Pydantic v2 + SQLite3)
- Frontend: TypeScript 5.x (`strict: true`, zero `any`) + React 18 (Vite + Tailwind CSS + `shadcn/ui`)  
**Storage**: SQLite (`erp.db`) com as novas tabelas `orcamentos` e `orcamento_itens`.  
**Testing**: `pytest` no backend e `tsc --noEmit && vite build` no frontend.

## Constitution Check

- **I. Inversão de Dependência de IA**: APROVADO.
- **II. Execução Determinística**: APROVADO. Baixa de estoque na aprovação do orçamento atualiza `estoque_erp` diretamente no SQLite, refletindo imediatamente na IA.
- **III. Desacoplamento Arquitetural**: APROVADO.
- **IV. Segurança, Queries Parametrizadas e Tipagem**: APROVADO.

## Project Structure

### Source Code (repository root)

```text
autoparts-ai/
├── database.py        # + Tabelas orcamentos e orcamento_itens, criar/listar/atualizar_status/excluir orçamento + baixa de estoque
├── schemas.py         # + OrcamentoItemInput, OrcamentoCreateRequest, OrcamentoStatusUpdateRequest, OrcamentoResponse
├── main.py            # + Rotas POST /orcamentos, GET /orcamentos, PATCH /orcamentos/{id}/status, DELETE /orcamentos/{id}
└── test_main.py       # + Testes de criação de orçamento por cliente, aprovação com baixa de estoque e conflito 409

autoparts-web/src/
├── types/autoparts.ts                     # + StatusOrcamento, OrcamentoItemSalvo, OrcamentoCliente, OrcamentoCreatePayload
├── schemas/orcamentoSchema.ts             # NOVO: Validação Zod para dados do cliente (Nome, Telefone, Veículo, Observações)
├── services/autopartsService.ts           # + criarOrcamento(), listarOrcamentos(), atualizarStatusOrcamento(), excluirOrcamento()
├── components/
│   ├── QuoteSummaryPanel.tsx              # + Botão "Confirmar Orçamento" abrindo o modal de dados do cliente
│   ├── ConfirmBudgetModal.tsx             # NOVO: Modal React Hook Form + Zod solicitando Nome, Telefone, Veículo e Observações
│   └── BudgetsView.tsx                    # NOVO: Módulo completo de Orçamentos por Cliente (substitui o placeholder)
└── App.tsx                                # Integra ConfirmBudgetModal e BudgetsView
```
