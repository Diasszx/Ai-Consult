# Implementation Plan: AutoParts AI & ERP Integrator

**Branch**: `001-autoparts-ai-erp` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-autoparts-ai-erp/spec.md`

## Summary

Construir o assistente inteligente de autopeças e integrador com ERP (SQLite) utilizando FastAPI, Python 3.10+, SDK unificado `google-genai` com no mínimo `gemini-3.8-flash` e validação com Pydantic v2. A arquitetura aplica o **Closure Pattern** para captura de metadados diretamente do banco de dados na execução da tool, garantindo que o array estruturado `pecas_encontradas` retornado no endpoint `POST /consultar-peca` seja imune a alucinações numéricas de preços ou saldos físicos, além de manter catálogo técnico e ERP completamente desacoplados.

## Technical Context

**Language/Version**: Python 3.10+ (compatível com 3.11/3.12/3.13)  
**Primary Dependencies**:
- `fastapi>=0.115.0`
- `uvicorn>=0.30.0`
- `pydantic>=2.9.0`
- `google-genai>=1.0.0` (modelo mínimo: `gemini-3.8-flash`)
- `python-dotenv>=1.0.1`  
**Storage**: SQLite 3 nativo (`erp.db`) via módulo padrão `sqlite3` com context manager e queries parametrizadas.  
**Testing**: `pytest`, `httpx` (para TestClient do FastAPI), chamadas mockadas e testes end-to-end com curl/OpenAPI.  
**Target Platform**: Linux / Windows Server / Containers Docker (executável como serviço web ASGI).  
**Project Type**: Web Service REST API com IA generativa e Function Calling.  
**Performance Goals**: Latência típica de resposta da IA em 1 a 3 segundos; timeout rígido configurado em 15 segundos.  
**Constraints**:
- Rota de API síncrona (`def`) para execução em threadpool sem bloqueio do event loop do FastAPI.
- Temperatura zero (`temperature=0.0`) na LLM para determinismo.
- Isolamento por requisição (Closure Pattern) para prevenir race conditions.  
**Scale/Scope**: Catálogo inicial em memória com 5 autopeças de teste cobrindo todas as variações de estado (com estoque, zerado, ausente no ERP e fora de escopo). Preparado para expansão futura com ChromaDB na Fase 2.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Separação de Responsabilidades**: APROVADO. Catálogo técnico separado do ERP; schemas Pydantic separados de rotas e banco.
- **Segurança e Anti-Injeção**: APROVADO. Todas as queries SQL são estritamente parametrizadas (`WHERE sku IN (?, ?)`).
- **Tratamento de Falhas e Timeouts**: APROVADO. Mapeamento explícito de códigos HTTP (422, 502, 504, 500) com mensagens padronizadas.
- **Fail-Fast**: APROVADO. Verificação obrigatória da presença de `GEMINI_API_KEY` durante o evento `lifespan` na inicialização da aplicação.

## Project Structure

### Documentation (this feature)

```text
specs/001-autoparts-ai-erp/
├── plan.md              # Este plano de implementação
├── research.md          # Fase 0: Decisões técnicas e arquiteturais
├── data-model.md        # Fase 1: Modelagem de dados, tabelas e schemas
├── quickstart.md        # Fase 1: Guia de execução e cenários de validação
├── contracts/           # Fase 1: Contrato de interface da API
│   └── openapi.yaml     # Especificação OpenAPI 3.1.0 completa
└── checklists/
    └── requirements.md  # Checklist de validação de qualidade
```

### Source Code (repository root)

```text
autoparts-ai/
├── main.py            # FastAPI app, ciclo de vida (lifespan), rota POST /consultar-peca e handlers de erro HTTP
├── schemas.py         # Contratos Pydantic v2 (ConsultaRequest, PecaERP, ConsultaResponse)
├── database.py        # SQLite nativo (init_db, get_db_connection, seed data e CATALOGO_TECNICO)
├── agent.py           # Orquestração google-genai, prompt guardrail e factory da Tool (Closure Pattern)
└── requirements.txt   # Dependências do projeto
```

**Structure Decision**:
Arquitetura modular concisa em camada única sob `autoparts-ai/`. Cada arquivo possui responsabilidade estrita e coesa:
- `schemas.py`: Apenas contratos de dados e validações (Pydantic v2).
- `database.py`: Apenas conexão com SQLite e definição dos dados de catálogo e semente.
- `agent.py`: Apenas comunicação com o modelo `gemini-2.5-flash` e closure da tool do ERP.
- `main.py`: Apenas orquestração HTTP da aplicação FastAPI, ciclo de vida e mapeamento de exceções.

## Complexity Tracking

| Componente | Justificativa | Alternativa Rejeitada |
|---|---|---|
| Closure Pattern na Tool | Garante captura de dados 100% livres de alucinação e thread-safe no escopo da requisição | Parsing de JSON do texto da LLM (frágil e sujeito a erros) |
| Catálogo em Dicionário | Viabiliza simular RAG no MVP sem complexidade de infraestrutura de vetores | ChromaDB no Day 1 (postergado para Fase 2 conforme escopo) |
| SQLite nativo | Elimina complexidade de migrações e ORMs pesados para apenas 1 tabela de 3 colunas | SQLAlchemy / Alembic (overhead desnecessário para o escopo) |
