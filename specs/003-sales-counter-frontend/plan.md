# Implementation Plan: Sistema Web Minimalista de Balcão de Vendas AI-First

**Branch**: `003-sales-counter-frontend` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-sales-counter-frontend/spec.md` ("use um frontend minimalista")

## Summary

Construir uma aplicação web front-end **minimalista e AI-First** em `autoparts-web/` utilizando **React, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form e Zod**. A interface coloca a **Central de Consulta com IA** como protagonista absoluta (estilo assistente minimalista centrado, sem tabelas pesadas de ERP), exibindo a resposta direta da IA acompanhada de mini-cards acionáveis (`PecaActionCard`) e um resumo de orçamento discreto e colapsável (`QuoteSummaryPanel`).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`, zero `any`) + React 18/19 (Vite)  
**Primary Dependencies**:
- `react`, `react-dom`
- `tailwindcss`, `clsx`, `tailwind-merge`, `class-variance-authority` (padrão `shadcn/ui`)
- `react-hook-form`, `@hookform/resolvers`, `zod` (validação estrita no cliente)
- `lucide-react` (ícones minimalistas)  
**Storage**: `localStorage` para persistir o orçamento rápido da sessão no navegador.  
**Testing**: TypeScript compiler check (`tsc --noEmit`), Vite production build (`npm run build`) e suíte `pytest` no backend para validar CORS.  
**Target Platform**: Navegadores Web Modernos (Desktop / Tablet de balcão).  
**Project Type**: Single Page Application (SPA) integrada à API FastAPI (`autoparts-ai`).  
**Performance Goals**: Bundle leve, zero re-renders desnecessários, validação instantânea (<10ms) no cliente.  
**Constraints**:
- Design **minimalista**: paleta neutra (`zinc`/`slate`), tipografia limpa, generoso espaço em branco, foco total na consulta com IA em vez de tabelas.
- Componentes pequenos, coesos e reutilizáveis seguindo Clean Code e SOLID.
- Camada de `services` isolada (`src/services/autopartsService.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Separação de Responsabilidades (SRP / DIP)**: APROVADO. `services/`, `schemas/`, `types/`, `hooks/` e `components/` estritamente separados.
- **Tipagem Forte e Zero `any`**: APROVADO. Todos os payloads, erros e props são estritamente tipados em TypeScript.
- **Validação React Hook Form + Zod**: APROVADO. `consultaSchema` espelha exatamente as regras do Pydantic v2 (`min=3`, `max=500`, `trim`).
- **Estados de UI Completos**: APROVADO. Tratamento explícito de `empty`, `loading` (skeletons), `error` (com retry) e `success`.

## Project Structure

### Documentation (this feature)

```text
specs/003-sales-counter-frontend/
├── plan.md                      # Este plano de implementação
├── research.md                  # Fase 0: Decisões de design minimalista e stack
├── data-model.md                # Fase 1: Interfaces TypeScript, schema Zod e árvore de componentes
├── quickstart.md                # Fase 1: Guia de execução do backend + frontend
├── contracts/
│   └── ui-api-contract.md       # Fase 1: Contratos de UI, badges e mapeamento de erros
└── checklists/
    └── requirements.md          # Checklist de validação da especificação
```

### Source Code (repository root)

```text
autoparts-ai/
└── main.py                                  # Atualizado com CORSMiddleware para permitir chamadas do frontend

autoparts-web/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── src/
    ├── main.tsx
    ├── App.tsx                              # Container minimalista centrado (AI-First)
    ├── index.css                            # Variáveis de tema shadcn/ui (zinc minimalista)
    ├── lib/
    │   ├── utils.ts                         # cn() helper (clsx + tailwind-merge)
    │   └── formatters.ts                    # Formatador monetário BRL (Intl.NumberFormat)
    ├── types/
    │   └── autoparts.ts                     # Contratos TypeScript (PecaERP, ConsultaResponse, ItemOrcamento, ApiError)
    ├── schemas/
    │   └── consultaSchema.ts                # Validação Zod para React Hook Form
    ├── services/
    │   └── autopartsService.ts              # Camada de comunicação HTTP com POST /consultar-peca
    ├── hooks/
    │   └── useOrcamento.ts                  # Hook customizado para gerenciar o orçamento rápido
    └── components/
        ├── ui/                              # Primitivos shadcn/ui reutilizáveis
        │   ├── button.tsx
        │   ├── card.tsx
        │   ├── badge.tsx
        │   ├── input.tsx
        │   ├── skeleton.tsx
        │   └── alert.tsx
        ├── AiSearchForm.tsx                 # Barra minimalista de consulta à IA + chips de sugestão
        ├── AiConsultationFeed.tsx           # Exibição em destaque da resposta da IA + estados (Loading/Erro/Vazio)
        ├── PecaActionCard.tsx               # Mini-card minimalista de peça com badge e botão "+ Orçamento"
        └── QuoteSummaryPanel.tsx            # Painel discreto/colapsável de orçamento rápido
```

**Structure Decision**:
Estrutura limpa em `autoparts-web/src/` seguindo separação sênior por camadas (`types`, `schemas`, `services`, `hooks`, `components/ui` e componentes de domínio pequenos e focados).

## Complexity Tracking

| Componente | Justificativa | Alternativa Rejeitada |
|---|---|---|
| Layout Centralizado Minimalista | Coloca a IA como foco único e elimina distração visual de tabelas | Dashboard pesado com múltiplas colunas e tabelas fixas |
| Hook `useOrcamento` isolado | Separa a regra de cálculo de subtotais e limite de estoque da camada visual | Misturar lógica de carrinho dentro do `App.tsx` |
| `autopartsService.ts` | Desacopla `fetch` e tratamento de status HTTP dos componentes React | Chamadas `fetch` espalhadas nos componentes |
