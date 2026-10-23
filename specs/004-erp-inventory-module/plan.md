# Implementation Plan: Navegação Lateral e Módulo de Gestão de Estoque ERP Sincronizado com IA

**Branch**: `004-erp-inventory-module` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-erp-inventory-module/spec.md`

## Summary

Adicionar a **Barra Lateral Minimalista (`AppSidebar`)** com os módulos **Consulta** (tela inicial padrão com a IA), **Estoque** (CRUD completo com tabela estilo ERP) e **Orçamentos** (placeholder navegável para a próxima spec). No backend (`autoparts-ai/`), persistir o catálogo dinâmico na tabela `catalogo_pecas` do SQLite (mantendo o desacoplamento com `estoque_erp`), expor os endpoints `GET/POST/PUT/DELETE /estoque` e fazer com que o agente de IA leia o catálogo atualizado diretamente do banco a cada consulta.

## Technical Context

**Language/Version**:
- Backend: Python 3.10+ (FastAPI + Pydantic v2 + SQLite3)
- Frontend: TypeScript 5.x (`strict: true`, zero `any`) + React 18 (Vite + Tailwind CSS + `shadcn/ui`)  
**Primary Dependencies**:
- Backend: `fastapi`, `pydantic`, `sqlite3`
- Frontend: `react-hook-form`, `@hookform/resolvers/zod`, `zod`, `lucide-react`, `clsx`, `tailwind-merge`  
**Storage**: SQLite (`erp.db`) com duas tabelas desacopladas (`catalogo_pecas` e `estoque_erp`).  
**Testing**: `pytest` no backend (cobrindo CRUD `/estoque` + reflexo imediato na consulta da IA) e `tsc --noEmit && vite build` no frontend.  
**Target Platform**: Web Application (Frontend + REST API).  
**Performance Goals**: Atualização instantânea da tabela e reflexão em tempo real (0ms de cache stale) nas consultas subsequentes da IA.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Inversão de Dependência de IA**: APROVADO. `llm_providers.py` permanece intacto e injetado via `Depends`.
- **II. Execução Determinística (Closure Pattern)**: APROVADO. `buscar_dados_erp` consulta o SQLite atualizado a cada requisição.
- **III. Desacoplamento Catálogo vs. ERP**: APROVADO. `catalogo_pecas` guarda metadados técnicos e `estoque_erp` guarda estritamente `sku`, `preco` e `quantidade`.
- **IV. Segurança, Queries Parametrizadas e Tipagem**: APROVADO. Todas as queries de `INSERT`, `UPDATE` e `DELETE` usam parâmetros `?`, validação Pydantic v2 no backend e React Hook Form + Zod no frontend.

## Project Structure

### Documentation (this feature)

```text
specs/004-erp-inventory-module/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── inventory-api-contract.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
autoparts-ai/
├── database.py        # Tabelas catalogo_pecas + estoque_erp, CRUD SQLite e obter_catalogo_atual()
├── schemas.py         # + EstoqueItemResponse, EstoqueCreateRequest, EstoqueUpdateRequest
├── agent.py           # Lê obter_catalogo_atual() dinamicamente do SQLite a cada pergunta
├── main.py            # + Rotas GET /estoque, POST /estoque, PUT /estoque/{sku}, DELETE /estoque/{sku}
└── test_main.py       # + Testes do CRUD /estoque e sincronização em tempo real com a IA

autoparts-web/src/
├── App.tsx                                # Layout com Sidebar Minimalista (Consulta inicial | Estoque | Orçamentos)
├── types/autoparts.ts                     # + ModuloAtivo, EstoqueItem, EstoqueCreateInput, EstoqueUpdateInput
├── schemas/estoqueSchema.ts               # NOVO: Validação Zod para criar/editar peça no estoque
├── services/autopartsService.ts           # + listarEstoque(), criarItemEstoque(), atualizarItemEstoque(), excluirItemEstoque()
└── components/
    ├── ui/
    │   ├── table.tsx                      # NOVO: Primitivo shadcn/ui Table
    │   └── dialog.tsx                     # NOVO: Primitivo shadcn/ui Dialog/Modal
    ├── AppSidebar.tsx                     # NOVO: Barra lateral minimalista (Consulta, Estoque, Orçamentos)
    ├── InventoryView.tsx                  # NOVO: Módulo de Estoque ERP (Tabela + Filtro + Ações)
    ├── InventoryFormModal.tsx             # NOVO: Modal React Hook Form + Zod para Criar/Editar peça
    └── BudgetsPlaceholderView.tsx         # NOVO: Visão base de Orçamentos (preparada para a próxima spec)
```

## Complexity Tracking

| Componente | Justificativa | Alternativa Rejeitada |
|---|---|---|
| `catalogo_pecas` + `estoque_erp` no SQLite | Garante que novos itens criados na UI fiquem disponíveis para a IA e sobrevivam a restarts sem violar o desacoplamento do schema `estoque_erp` | Alterar apenas dicionário em memória (perderia dados ao reiniciar o Uvicorn) |
| `AppSidebar` com estado `moduloAtivo` | Mantém a conversa da IA viva em memória enquanto o usuário edita o estoque e volta para perguntar | Recarregar a página inteira a cada troca de menu |
