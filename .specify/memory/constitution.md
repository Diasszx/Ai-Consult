# AutoParts AI Constitution

## Core Principles

### I. Inversão de Dependência e Desacoplamento de Provedor de IA (SOLID / DIP)
A camada de orquestração do agente e as rotas da API NÃO DEVEM depender diretamente de implementações concretas de SDKs de IA (como `google-genai` ou `openai`/DeepSeek).
- Toda interação com modelos de linguagem DEVE ocorrer através de uma interface/abstração injetada via Injeção de Dependência (Dependency Injection).
- A troca de provedor de IA (ex: Google Gemini, DeepSeek, OpenAI) DEVE ser realizada apenas via configuração/injeção, sem alterar a regra de negócio, o prompt do sistema, a closure de captura do ERP ou as rotas HTTP.
- Quando o provedor Google Gemini for utilizado, o modelo mínimo permitido é `gemini-3.8-flash` (modelos `gemini-2.5-flash` ou anteriores são proibidos).

### II. Execução Determinística e Anti-Alucinação (Closure Pattern)
Toda consulta a dados numéricos, valores monetários (preços) e quantidades físicas em estoque DEVE ser extraída diretamente do ERP (banco de dados) através de ferramentas (Function Calling / Tool Calling) com escopo isolado por requisição (Closure Pattern).
- A IA NUNCA deve inferir ou inventar valores comerciais.
- O payload estruturado de retorno ao cliente DEVE ser preenchido exclusivamente com dados do banco de dados, independentemente de qual provedor de IA esteja ativo.

### III. Desacoplamento Arquitetural (Catálogo vs. ERP)
O catálogo técnico (dados de engenharia, montadora, aplicação veicular e compatibilidade) DEVE permanecer desacoplado do schema operacional do ERP (preço e saldo físico de estoque).
- Permite migrações e substituições da camada de catálogo (como para ChromaDB ou bases vetoriais) sem impactar a estrutura relacional do ERP.

### IV. Segurança, Fail-Fast e Tipagem Estrita
- Validação fail-fast: A aplicação não deve iniciar se as credenciais mandatórias do provedor de IA ativo estiverem ausentes.
- Queries parametrizadas: Prevenção obrigatória de SQL Injection utilizando queries parametrizadas (`WHERE sku IN (?, ?)`).
- Tipagem forte: Uso estrito de Pydantic v2 e Protocol/ABC para validação de contratos de entrada, saída e adaptadores.

### V. Tratamento Semântico e Agnóstico de Erros HTTP
A API DEVE mapear exceções de provedores de IA de forma agnóstica (sem acoplar rotas a exceções proprietárias de um único SDK):
- `422`: Payloads inválidos ou fora dos limites.
- `502`: Falhas de comunicação ou autenticação com o provedor de IA ativo.
- `504`: Timeouts na resposta do provedor de IA ativo (limite de 15 segundos).
- `500`: Falhas internas ou de persistência no banco de dados.

## Governance
- Esta Constituição é soberana e sobrepõe quaisquer decisões técnicas pontuais.
- Qualquer alteração nos princípios requer validação e consentimento explícito.

**Version**: 1.2.0 | **Ratified**: 2026-10-22 | **Last Amended**: 2026-10-22
