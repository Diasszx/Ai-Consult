# Implementation Plan: Desacoplamento e Injeção de Dependência do Provedor de IA (DeepSeek / Gemini)

**Branch**: `002-llm-provider-decoupling` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-llm-provider-decoupling/spec.md`

## Summary

Refatorar a camada de Inteligência Artificial aplicando os princípios **SOLID (Dependency Inversion Principle + Strategy/Adapter Pattern)** e **Injeção de Dependência do FastAPI (`Depends`)**. O objetivo é desacoplar completamente `main.py` e `agent.py` de qualquer SDK específico, introduzindo o módulo `llm_providers.py` com suporte nativo à **DeepSeek** (`DeepSeekProvider` com ciclo completo de Tool Calling em 2 etapas via API `/chat/completions`) e ao **Google Gemini** (`GeminiProvider`), permitindo alternar de IA apenas mudando a variável de ambiente ou a fábrica injetada.

## Technical Context

**Language/Version**: Python 3.10+ (testado em Python 3.13)  
**Primary Dependencies**:
- `fastapi>=0.115.0` (com `Depends` para Injeção de Dependência)
- `httpx>=0.27.0` (para chamadas REST/OpenAI-compatible na API da DeepSeek)
- `google-genai>=1.0.0` (isolado exclusivamente dentro de `GeminiProvider`)
- `pydantic>=2.9.0`
- `python-dotenv>=1.0.1`
- `pytest>=8.0.0`  
**Storage**: SQLite 3 nativo (`erp.db`) — permanece 100% inalterado.  
**Testing**: `pytest` cobrindo `DeepSeekProvider`, `GeminiProvider`, injeção via `Depends`, fail-fast por provedor e cenários 1 a 5.  
**Target Platform**: Linux / Windows Server / Containers ASGI.  
**Project Type**: Web Service REST API com arquitetura limpa e adaptadores de IA plugáveis.  
**Performance Goals**: Timeout rígido de 15 segundos em qualquer provedor ativo; retry automático para erros transitórios (503/429).  
**Constraints**:
- `main.py` e `agent.py` NÃO DEVEM importar `google.genai` ou clientes HTTP específicos.
- O **Closure Pattern** (`pecas_capturadas` preenchido diretamente do SQLite) deve ser preservado no `agent.py` e passado como callback para o provedor injetado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Inversão de Dependência (SOLID / DIP)**: APROVADO. `main.py` injeta `LLMProvider` via `Depends(get_llm_provider)` e repassa para `agent.py`.
- **II. Execução Determinística (Closure Pattern)**: APROVADO. O callback `buscar_dados_erp` continua populando `pecas_capturadas` diretamente do SQLite em ambos os provedores (`DeepSeekProvider` e `GeminiProvider`).
- **III. Desacoplamento Catálogo vs. ERP**: APROVADO. Nenhuma alteração necessária em `database.py` ou `schemas.py`.
- **IV. Segurança e Fail-Fast por Provedor**: APROVADO. `validar_configuracao_llm()` no `lifespan` verifica a chave específica do provedor ativo (`DEEPSEEK_API_KEY` ou `GEMINI_API_KEY`).
- **V. Tratamento Agnóstico de Erros HTTP**: APROVADO. Exceções `LLMTimeoutError` (504) e `LLMProviderError` (502) desacoplam a rota HTTP dos SDKs.

## Project Structure

### Documentation (this feature)

```text
specs/002-llm-provider-decoupling/
├── plan.md                          # Este plano de implementação
├── research.md                      # Fase 0: Decisões de arquitetura e protocolo DeepSeek
├── data-model.md                    # Fase 1: Interfaces, classes e diagramas de sequência
├── quickstart.md                    # Fase 1: Guia prático de troca entre DeepSeek e Gemini
├── contracts/
│   └── llm-provider-contract.md     # Fase 1: Contrato Protocol, JSON Schema da Tool e Env Vars
└── checklists/
    └── requirements.md              # Checklist de qualidade da especificação
```

### Source Code (repository root)

```text
autoparts-ai/
├── main.py            # FastAPI app, lifespan com validação agnóstica, rota com Depends(get_llm_provider)
├── agent.py           # Regra de negócio, System Prompt, Closure Pattern (recebe provider: LLMProvider)
├── llm_providers.py   # NOVO: Interface LLMProvider, DeepSeekProvider, GeminiProvider, Factory e Exceções
├── schemas.py         # Contratos Pydantic v2 (Inalterado)
├── database.py        # SQLite nativo e CATALOGO_TECNICO (Inalterado)
├── requirements.txt   # Dependências do projeto
├── .env.example       # Exemplo documentando LLM_PROVIDER, DEEPSEEK_API_KEY e GEMINI_API_KEY
└── test_main.py       # Suíte de testes unitários e de integração para DeepSeek, Gemini e DI
```

**Structure Decision**:
A introdução do módulo dedicado `autoparts-ai/llm_providers.py` isola toda a complexidade de comunicação externa com provedores de IA. Tanto `database.py` quanto `schemas.py` permanecem intocados, provando a eficácia do desacoplamento arquitetural.

## Complexity Tracking

| Componente | Justificativa | Alternativa Rejeitada |
|---|---|---|
| `LLMProvider` Protocol + `Depends` | Permite trocar entre DeepSeek, Gemini ou Mocks mudando apenas 1 configuração | Acoplar `if/else` de múltiplos SDKs dentro de `agent.py` |
| `DeepSeekProvider` via `httpx` | Usa biblioteca já instalada no projeto com controle total de timeout (15s) e `tool_calls` | Instalar SDK pesado `openai` ou `langchain` apenas para 1 endpoint REST |
| Exceções `LLMProviderError` / `LLMTimeoutError` | Desacopla `main.py` das exceções internas do Google ou da DeepSeek | Capturar dezenas de exceções de diferentes bibliotecas na rota HTTP |
