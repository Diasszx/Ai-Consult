# Phase 0: Research & Technical Decisions - Minimalist AI Sales Counter Frontend

## Decision 1: Estética e Arquitetura de Layout Minimalista (AI-First)
- **Decisão**: Adotar um layout **minimalista, centrado e sem poluição visual** (inspirado no padrão `shadcn/ui` neutral zinc/slate e interfaces como Perplexity / Linear). A tela inteira gira em torno de um container centralizado (`max-w-3xl` a `max-w-4xl`) onde a **Consulta com IA** é o único protagonista inicial, eliminando menus laterais fixos pesados ou tabelas de ERP tradicionais.
- **Justificativa**: Atende diretamente ao pedido do usuário ("use um frontend minimalista" e "parte principal para consultar com IA ao invés de olhar a tabela"). No balcão de vendas, menos elementos visuais significam zero distração: o vendedor digita a dúvida, lê a resposta direta da IA e vê os mini-cards das peças encontradas logo abaixo.
- **Como o Orçamento Rápido se comporta no design minimalista**: Em vez de ocupar metade da tela o tempo todo, o orçamento aparece de forma discreta e elegante (um painel colapsável/barra flutuante ou card lateral enxuto que só ganha destaque quando o vendedor adiciona uma peça).

## Decision 2: Stack Frontend e Padronização de Componentes
- **Decisão**:
  - **Build & Core**: Vite + React 18/19 + TypeScript (`strict: true`, zero `any`).
  - **Estilização & UI**: Tailwind CSS + primitivos **shadcn/ui** (`Button`, `Card`, `Badge`, `Input`/`Textarea`, `Skeleton`, `Alert`).
  - **Formulário e Validação**: `react-hook-form` + `@hookform/resolvers/zod` + `zod` (espelhando `min=3`, `max=500`, `trim` do Pydantic v2).
  - **Ícones**: `lucide-react` (uso comedido e funcional).
- **Justificativa**: Garante código limpo, acessível, fácil de dar manutenção e 100% aderente às boas práticas de Front-end Sênior (Clean Code e SOLID).

## Decision 3: Camada de Services Desacoplada (`src/services/autopartsService.ts`)
- **Decisão**: Isolar toda chamada HTTP em `src/services/autopartsService.ts` com `fetch` nativo + `AbortController` (timeout de 16s no cliente), tipando estritamente `ConsultaRequest`, `PecaERP`, `ConsultaResponse` e `ApiError`.
- **Justificativa**: Componentes React nunca devem fazer `fetch` diretamente nem conhecer URLs ou tratamento bruto de status HTTP (`422`, `502`, `504`, `500`). Isso respeita o Single Responsibility Principle (SRP) e Dependency Inversion Principle (DIP).

## Decision 4: CORS no Backend FastAPI (`autoparts-ai/main.py`)
- **Decisão**: Adicionar `CORSMiddleware` no `autoparts-ai/main.py` permitindo origens locais (`http://localhost:5173`, `http://127.0.0.1:5173`, ou configurável via `CORS_ORIGINS`).
- **Justificativa**: Indispensável para que o navegador permita requisições `POST /consultar-peca` vindas do servidor Vite.
