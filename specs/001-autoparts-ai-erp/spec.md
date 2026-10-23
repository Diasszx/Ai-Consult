# Feature Specification: AutoParts AI & ERP Integrator (v2.0)

**Feature Branch**: `001-autoparts-ai-erp`

**Created**: 2026-10-22

**Status**: Ready for Planning

**Input**: User description: "ajuste essa spec para isso: Specification Document (v2.0 — Final): AutoParts AI & ERP Integrator"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulta de Estoque e Preço com Retorno Estruturado e Conversacional (Priority: P1)

Como um sistema cliente (Frontend, n8n ou vendedor),
quero enviar uma consulta em linguagem natural com modelo/ano/peça para obter uma resposta estruturada (`pecas_encontradas`) e amigável (`resposta`),
para que eu possa tanto apresentar os dados estruturados de preço e saldo na interface quanto ler a resposta comercial sintetizada.

**Why this priority**: É o core do sistema. Permite a integração direta com interfaces ricas (cards, tabelas) ao mesmo tempo que oferece a síntese textual amigável gerada por IA.

**Independent Test**:
Enviar requisição POST para consulta de peça conhecida (ex: amortecedor dianteiro do Gol G5 2012) e validar:
- Código HTTP 200
- Lista `pecas_encontradas` contendo SKU, `nome_peca`, `em_estoque=True`, preço numérico e saldo físico
- Texto `resposta` coerente e com valores monetários em formato brasileiro (R$ X,XX)

**Acceptance Scenarios**:

1. **Given** que o SKU `AMOR-G5-01` possui 12 unidades a R$ 250,00 no ERP, **When** o cliente envia `{"pergunta": "Preciso do amortecedor dianteiro do Gol G5 2012 1.0, tem no estoque?"}`, **Then** o sistema retorna status `sucesso`, inclui o objeto de `AMOR-G5-01` no array `pecas_encontradas` e uma resposta textual confirmando disponibilidade e preço.
2. **Given** que o usuário digita uma pergunta com espaços extras nas pontas, **When** o payload é recebido, **Then** a validação de entrada higieniza os espaços automaticamente (`str_strip_whitespace=True`).

---

### User Story 2 - Resolução de Perguntas Ambíguas com Múltiplas Peças (Priority: P2)

Como um comprador ou vendedor que formula perguntas genéricas (ex: sem especificar eixo dianteiro ou traseiro),
quero que o sistema traga todas as opções compatíveis do catálogo e consulte o estoque de todas elas em uma única rodada,
para que eu veja imediatamente as opções disponíveis e as sem estoque.

**Why this priority**: Evita múltiplas trocas de mensagens desnecessárias e resolve o cenário mais comum do aftermarket automotivo, no qual o cliente não lembra se precisa da peça dianteira ou traseira.

**Independent Test**:
Consultar "Tem amortecedor pro Gol G5 2011?" e verificar se o array `pecas_encontradas` traz ambos os itens (`AMOR-G5-01` e `AMOR-G5-02`), refletindo fielmente os estoques (um com saldo e outro zerado).

**Acceptance Scenarios**:

1. **Given** que o Gol G5 possui amortecedor dianteiro (com estoque) e traseiro (estoque zerado), **When** o usuário envia `"Tem amortecedor pro Gol G5 2011?"`, **Then** o sistema retorna ambas as peças em `pecas_encontradas`, sendo uma com `em_estoque=true` e a outra com `em_estoque=false`, sintetizando as duas situações no texto.

---

### User Story 3 - Conflito de Cadastro entre Catálogo Técnico e ERP (Priority: P3)

Como operador do sistema ou cliente consultor,
quero que peças presentes no catálogo técnico mas ausentes do ERP sejam reportadas com clareza (sem quebrar a requisição e sem alucinar valores),
para que o usuário saiba que a peça existe para o veículo, porém não possui cadastro comercial ativo no momento.

**Why this priority**: Garante a consistência do modelo de dados desacoplado e evita falhas 500 quando há descasamento de cadastro.

**Independent Test**:
Consultar peça existente apenas no catálogo (ex: velas do Novo Uno `VELA-UNO-11`, não cadastrada no ERP) e verificar:
- `em_estoque=false`
- `preco=None` e `quantidade=None`
- Mensagem indicando ausência de dados no ERP

**Acceptance Scenarios**:

1. **Given** que o SKU `VELA-UNO-11` existe no catálogo mas não possui registro no ERP, **When** consultado pelo usuário, **Then** o sistema retorna `em_estoque=false`, campos de preço/quantidade nulos e texto explicando a situação.

---

### User Story 4 - Validação de Entrada e Tratamento Específico de Erros HTTP (Priority: P4)

Como consumidor da API (Frontend ou n8n),
quero receber códigos HTTP semânticos (422, 502, 504, 500) com mensagens de erro claras,
para que o cliente automatizado trate timeouts de IA, erros de sintaxe ou indisponibilidade de infraestrutura de forma adequada.

**Why this priority**: Essencial para integração robusta em produção e observabilidade.

**Independent Test**:
- Enviar payload com menos de 3 caracteres ou mais de 500 caracteres -> HTTP 422
- Simular timeout no provedor de IA (>15s) -> HTTP 504
- Simular falha de autenticação/API da IA -> HTTP 502
- Simular falha interna de banco de dados -> HTTP 500

**Acceptance Scenarios**:

1. **Given** uma requisição com `"pergunta": "Oi"`, **When** enviada para `/consultar-peca`, **Then** a API responde imediatamente com HTTP 422.
2. **Given** uma lentidão do provedor de IA superior a 15 segundos, **When** a chamada é realizada, **Then** a API interrompe o processamento e responde HTTP 504 Gateway Timeout.

---

### Edge Cases

- **Perguntas fora de escopo (Guardrail)**: Usuário pergunta sobre receitas, esportes ou assuntos não relacionados a autopeças. O assistente deve recusar educadamente sem acionar ferramentas de consulta ao ERP.
- **Pergunta sem correspondência no catálogo**: Item solicitado não existe no catálogo técnico da loja. O sistema deve responder transparentemente que não comercializa o item, retornando `pecas_encontradas: []`.
- **Injeção de Caracteres Especiais ou Tentativa de SQL Injection**: Validação estrita por Pydantic e queries parametrizadas (`WHERE sku IN (?, ?)`) protegem contra injeção no SQLite.
- **Concorrência e Isolamento de Sessão (Race Condition)**: Múltiplas requisições simultâneas não devem compartilhar dados de buffers de peças capturadas; cada chamada possui closure e contexto isolados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE expor o endpoint `POST /consultar-peca` validando a entrada com Pydantic v2 (mínimo de 3 caracteres, máximo de 500 caracteres, sanitização de espaços em branco).
- **FR-002**: O sistema DEVE inicializar o banco de dados e aplicar os dados de semente (seed data) de forma idempotente durante a inicialização da aplicação (ciclo de vida / lifespan).
- **FR-003**: A aplicação DEVE manter o catálogo técnico de autopeças (SKU, nome da peça, marca e compatibilidade/aplicação) desacoplado do schema operacional do ERP.
- **FR-004**: O agente inteligente DEVE receber o catálogo técnico como contexto no System Prompt e aplicar diretrizes de guardrail para responder estritamente sobre autopeças.
- **FR-005**: O agente DEVE operar com temperatura 0.0 e invocar a ferramenta de busca de dados no ERP sempre que identificar SKUs compatíveis com a solicitação do usuário.
- **FR-006**: A ferramenta de busca no ERP DEVE consultar o banco de dados em uma única consulta parametrizada para múltiplos SKUs (`WHERE sku IN (...)`).
- **FR-007**: A execução da ferramenta DEVE capturar diretamente os registros reais do banco de dados em um buffer isolado por requisição (Closure Pattern), garantindo que os metadados de preço e estoque retornados ao cliente sejam fidedignos e livres de alucinações.
- **FR-008**: O endpoint DEVE retornar a resposta contendo `status`, a lista estruturada `pecas_encontradas` (`sku`, `nome_peca`, `em_estoque`, `preco`, `quantidade`) e a `resposta` comercial em texto formatado.
- **FR-009**: O sistema DEVE mapear e emitir respostas de erro HTTP padronizadas:
  - `422`: payload inválido
  - `502`: erro de comunicação com a API do provedor de IA
  - `504`: tempo limite excedido (timeout de 15 segundos) na chamada de IA
  - `500`: falha interna ou de banco de dados
- **FR-010**: O sistema DEVE abortar a inicialização caso a variável de ambiente `GEMINI_API_KEY` não esteja definida (validação fail-fast).

### Key Entities

- **ConsultaRequest**: Contrato de entrada contendo a pergunta do usuário com regras de validação (3 a 500 caracteres).
- **PecaERP**: Entidade representando o item no retorno da API contendo SKU, nome, indicador booleano de disponibilidade em estoque, preço unitário e saldo físico.
- **ConsultaResponse**: Contrato de saída contendo status, lista de `PecaERP` e resposta textual amigável.
- **CatalogoTecnico**: Base de conhecimento de autopeças contendo código SKU, nome, marca fabricante e descrição de aplicação veicular.
- **EstoqueERP**: Tabela relacional operacional contendo estritamente SKU (chave primária), preço unitário e quantidade física em estoque.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O tempo limite para resposta de qualquer chamada ao provedor de IA é delimitado em até 15 segundos, retornando HTTP 504 caso excedido.
- **SC-002**: 100% dos valores numéricos de preço e estoque presentes em `pecas_encontradas` devem ser idênticos aos persistidos na base de dados SQLite, com zero taxa de alucinação numérica.
- **SC-003**: 100% das requisições fora do padrão (vazias, <3 chars, >500 chars) devem ser rejeitadas com HTTP 422 sem acionamento de IA.
- **SC-004**: Suporte a consultas concorrentes sem contaminação cruzada de dados entre requisições (buffer com isolamento por requisição).

## Assumptions

- O catálogo técnico em memória simula o comportamento que na Fase 2 será assumido por uma base vetorial (ChromaDB) com busca semântica, sem necessidade de alterar o schema da tabela `estoque_erp`.
- A rota síncrona `def` é executada em threadpool pelo framework web assíncrono para garantir operação não-bloqueante no event loop.
- O modelo de linguagem utilizado é o `gemini-2.5-flash` via SDK oficial `google-genai`.
