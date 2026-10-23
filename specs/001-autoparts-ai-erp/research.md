# Phase 0: Research & Technical Decisions - AutoParts AI & ERP Integrator

## Decision 1: Framework Web e Concorrência na Execução da IA
- **Decisão**: Utilizar FastAPI com rota de consulta síncrona (`def consultar_peca`) em vez de rota assíncrona (`async def`).
- **Justificativa**: A chamada ao SDK `google-genai` e as consultas ao `sqlite3` são síncronas/bloqueantes. Ao declarar a rota com `def`, o FastAPI a executa automaticamente em uma threadpool (`anyio.to_thread.run_sync`), impedindo que o event loop principal do servidor seja travado durante a chamada de 1 a 15 segundos da IA.
- **Alternativas consideradas**:
  - `async def` com chamadas bloqueantes: Rejeitado, pois bloquearia todas as outras conexões do servidor no mesmo processo.
  - Implementação com `asyncio.to_thread` explícito: Válido, mas o padrão idiomático do FastAPI com `def` já realiza esse gerenciamento de forma limpa e nativa.

## Decision 2: SDK e Modelo de Inteligência Artificial
- **Decisão**: Utilizar o SDK oficial unificado `google-genai` (versão `>=1.0.0`) com o modelo `gemini-2.5-flash`, temperatura `0.0` e timeout delimitado em 15 segundos (`http_options=types.HttpOptions(timeout=15000)`).
- **Justificativa**: A biblioteca `google-genai` é a versão oficial e recomendada pelo Google (substituindo a legada `google-generativeai`). O modelo `gemini-2.5-flash` oferece latência ultrabaixa para Function Calling. A temperatura `0.0` garante o comportamento determinístico exigido no spec funcional.
- **Alternativas consideradas**:
  - `google-generativeai` (legado): Rejeitado por estar em processo de descontinuação em prol da nova `google-genai`.
  - Modelos `pro`: Rejeitado para este MVP por apresentarem maior latência sem necessidade para a complexidade deste catálogo.

## Decision 3: Estratégia Anti-Alucinação para Metadados do ERP (Closure Pattern)
- **Decisão**: Instanciar a tool `buscar_dados_erp(skus: list[str])` dentro do escopo de cada requisição como uma closure que popula diretamente um dicionário local `pecas_capturadas: dict[str, PecaERP]`.
- **Justificativa**: Garante garantia matemática contra alucinação de preço e saldo de estoque. Mesmo que a LLM sintetize texto comercial com algum erro de digitação, o array `pecas_encontradas` retornado no JSON da resposta é preenchido exclusivamente com dados brutos extraídos do SQLite. Além disso, a closure assegura thread-safety e isolamento total entre requisições concorrentes sem variáveis globais.
- **Alternativas consideradas**:
  - Extrair dados do ERP a partir do texto de saída da LLM com regex/JSON parsing: Rejeitado por ser frágil e sujeito a erros de interpretação da IA.
  - Variáveis globais para histórico: Rejeitado por gerar condições de corrida (race conditions) em acessos concorrentes.

## Decision 4: Desacoplamento entre Catálogo Técnico e Banco ERP (Fase 1 vs Fase 2)
- **Decisão**: Catálogo técnico armazenado em memória (`CATALOGO_TECNICO: dict[str, dict]`) e injetado no System Prompt; ERP isolado em tabela relacional SQLite (`estoque_erp` com apenas `sku`, `preco`, `quantidade`).
- **Justificativa**: Atende perfeitamente ao princípio SOLID de responsabilidade única e desacoplamento. Na Fase 2, o dicionário em memória será substituído por uma busca semântica em banco vetorial (ChromaDB) indexando PDFs de catálogo, sem que uma única linha do schema ou lógica do ERP precise ser alterada.
- **Alternativas consideradas**:
  - Misturar nome, marca e compatibilidade dentro da tabela `estoque_erp`: Rejeitado, pois acoplaria catálogo técnico e dados de inventário, violando a arquitetura proposta no spec.

## Decision 5: Gerenciamento de Conexões SQLite
- **Decisão**: Conexões pontuais via context manager (`get_db_connection`) com `timeout=10.0` e `row_factory = sqlite3.Row`.
- **Justificativa**: O SQLite em arquivo local opera com alto desempenho para leituras e é simples para o MVP. O context manager garante fechamento seguro de conexão e liberação de locks.
- **Alternativas consideradas**:
  - SQLAlchemy / ORM completo: Desnecessário para apenas 1 tabela com 3 colunas simples (YAGNI). O uso do `sqlite3` nativo mantém a base leve, com inicialização imediata e zero overhead de dependências pesadas.

## Decision 6: Validação de Entrada e Mapeamento de Erros Semânticos
- **Decisão**:
  - Validação via Pydantic v2 com `ConfigDict(str_strip_whitespace=True)` e `Field(min_length=3, max_length=500)` -> HTTP 422.
  - Captura de `httpx.TimeoutException` -> HTTP 504 Gateway Timeout.
  - Captura de `genai_errors.APIError` -> HTTP 502 Bad Gateway.
  - Captura de `sqlite3.Error` / `Exception` -> HTTP 500 Internal Server Error.
  - Validação fail-fast de `GEMINI_API_KEY` no `lifespan` do FastAPI.
- **Justificativa**: Facilita a integração com frontends e ferramentas como n8n, permitindo que a camada consumidora tome decisões programáticas claras com base no status HTTP recebido.
