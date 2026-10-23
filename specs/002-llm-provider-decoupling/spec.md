# Feature Specification: Desacoplamento e Injeção de Dependência do Provedor de IA (DeepSeek / Gemini)

**Feature Branch**: `002-llm-provider-decoupling`

**Created**: 2026-10-22

**Status**: Ready for Planning

**Input**: User description: "preciso abrir outra spec para desaclopação. Eu troquei a ia que iria utilizar pela ia deepseek e isso resultou em um erro ao tentar consultar a ia pq a chamada da api está errada. Essa parte do codigo deve ser injetada(dependecia) e ser desaclopada para caso eu queria alterar é só mudar a chamada"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulta de Autopeças Utilizando o Provedor DeepSeek (Priority: P1)

Como administrador/desenvolvedor do sistema AutoParts AI,
quero configurar o sistema para utilizar a IA da DeepSeek como motor de raciocínio e chamada de ferramentas (Tool Calling),
para que as consultas em `POST /consultar-peca` funcionem perfeitamente sem depender exclusivamente da infraestrutura do Google Gemini.

**Why this priority**: Resolve a dor imediata que motivou a especificação: ao trocar para a DeepSeek, o acoplamento com o formato de chamada do Gemini quebrou a aplicação. Garantir que a DeepSeek processe o catálogo e acione a consulta ao ERP restaura a operação imediata.

**Independent Test**: Configurar o provedor ativo como `deepseek` com sua respectiva chave de API, enviar uma requisição para `POST /consultar-peca` e validar que o sistema identifica o SKU no catálogo, executa a função de busca no ERP e retorna HTTP 200 com `pecas_encontradas` e `resposta` comercial.

**Acceptance Scenarios**:

1. **Given** que o provedor configurado é `deepseek` e o SKU `AMOR-G5-01` possui 12 unidades a R$ 250,00 no ERP, **When** o cliente envia `{"pergunta": "Preciso do amortecedor dianteiro do Gol G5 2012 1.0, tem no estoque?"}`, **Then** o provedor DeepSeek identifica o SKU, aciona a ferramenta de busca no ERP e retorna HTTP 200 com os metadados exatos do banco em `pecas_encontradas` e a resposta comercial formatada.
2. **Given** que o provedor configurado é `deepseek`, **When** o cliente faz uma pergunta ambígua ("Tem amortecedor pro Gol G5 2011?"), **Then** o provedor consulta múltiplos SKUs (`AMOR-G5-01` e `AMOR-G5-02`) e retorna ambos corretamente no array estruturado.

---

### User Story 2 - Troca Transparente de Provedor via Injeção de Dependência (Priority: P2)

Como desenvolvedor responsável pela manutenção do sistema,
quero que o motor de IA seja desacoplado da regra de negócio e injetado como uma dependência na rota/serviço,
para que eu possa alternar entre DeepSeek, Gemini ou futuros provedores alterando apenas uma variável de configuração ou a injeção da dependência, sem modificar a rota HTTP, o prompt de negócio ou a lógica de captura do ERP.

**Why this priority**: Aplica o princípio de Inversão de Dependência (SOLID - DIP), eliminando o acoplamento rígido que obrigava a reescrever o fluxo do agente a cada mudança de fornecedor de IA.

**Independent Test**: Alternar o provedor injetado (entre `deepseek` e `gemini`, ou um provedor simulado em testes) sem alterar nenhuma linha da rota ou da função de captura do ERP, verificando que o contrato de entrada e saída (`ConsultaRequest` / `ConsultaResponse`) permanece 100% idêntico.

**Acceptance Scenarios**:

1. **Given** que a lógica de negócio recebe o provedor de IA por injeção de dependência, **When** o administrador altera a configuração de provedor de `gemini` para `deepseek` (ou vice-versa), **Then** o sistema passa a utilizar o novo provedor sem exigir alteração de código nas rotas ou nas regras do ERP.
2. **Given** um ambiente de teste automatizado, **When** uma implementação simulada (Fake/Mock Provider) é injetada na rota da API, **Then** a rota executa todo o fluxo de negócio sem realizar chamadas externas de rede.

---

### User Story 3 - Tratamento Agnóstico de Erros e Validação Fail-Fast por Provedor (Priority: P3)

Como integrador de sistemas (Frontend ou n8n),
quero que falhas de comunicação, autenticação ou timeout de qualquer provedor de IA ativo sejam traduzidas para erros de domínio padronizados (`502 Bad Gateway` e `504 Gateway Timeout`), e que o servidor valide na inicialização a credencial correspondente ao provedor escolhido,
para que o comportamento de resiliência da API seja previsível independentemente de qual IA está rodando por trás.

**Why this priority**: Antes, a rota capturava exceções exclusivas de um único fornecedor e exigia obrigatoriamente a chave do Gemini mesmo quando outro provedor era desejado.

**Independent Test**:
- Iniciar a aplicação com provedor `deepseek` sem chave configurada -> deve falhar imediatamente no startup (fail-fast).
- Simular erro de API ou timeout no provedor `deepseek` -> deve retornar HTTP 502 ou HTTP 504 padronizado.

**Acceptance Scenarios**:

1. **Given** que o provedor ativo é `deepseek`, **When** a aplicação inicia apenas com a credencial da DeepSeek configurada (sem chave do Gemini), **Then** a aplicação inicializa normalmente sem exigir chaves de outros provedores inativos.
2. **Given** uma falha de comunicação ou chave inválida no provedor de IA ativo (`deepseek` ou `gemini`), **When** uma consulta é enviada para `/consultar-peca`, **Then** o sistema captura a exceção de domínio desacoplada e retorna HTTP 502 com mensagem clara identificando o provedor em uso.
3. **Given** que o provedor de IA ativo demora mais de 15 segundos para responder, **When** a consulta é processada, **Then** o sistema interrompe a espera e retorna HTTP 504 Gateway Timeout.

---

### Edge Cases

- **Provedor Desconhecido na Configuração**: Se o administrador definir um nome de provedor inválido ou não suportado (ex: `LLM_PROVIDER=inexistente`), o sistema deve falhar imediatamente na inicialização (fail-fast) informando quais são os provedores válidos (`deepseek`, `gemini`).
- **Múltiplas Chamadas de Tool ou Argumentos em JSON String**: Provedores compatíveis com o padrão OpenAI/DeepSeek retornam os argumentos da tool como string JSON (`{"skus": [...]}`) e exigem o envio do resultado da tool em uma segunda mensagem (`role: "tool"`) para gerar a resposta final. O adaptador do provedor deve encapsular esse ciclo completo de forma transparente para o serviço de negócio.
- **Perguntas Fora de Escopo (Guardrail)**: Tanto na DeepSeek quanto no Gemini, perguntas fora do contexto automotivo não devem acionar a tool de busca no ERP e devem retornar `pecas_encontradas: []`.
- **Conflito Catálogo vs. ERP**: Independentemente do provedor injetado, SKUs presentes no catálogo mas ausentes no banco (como `VELA-UNO-11`) devem continuar populando o buffer local via Closure Pattern com `em_estoque=false`, `preco=null` e `quantidade=null`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE definir um contrato/interface abstrato de Provedor de IA que receba as instruções do sistema (System Prompt), a pergunta do usuário e a função de ferramenta (`buscar_dados_erp`), retornando o texto comercial final.
- **FR-002**: O serviço de consulta e a rota `POST /consultar-peca` DEVEM receber o provedor de IA por meio de Injeção de Dependência, sem instanciar clientes de fornecedores específicos diretamente dentro da regra de negócio ou da rota HTTP.
- **FR-003**: O sistema DEVE disponibilizar um adaptador concreto para o provedor **DeepSeek** (suportando geração determinística com temperatura `0.0`, timeout de 15 segundos e ciclo completo de execução de Tool Calling).
- **FR-004**: O sistema DEVE manter o adaptador concreto para o provedor **Google Gemini** (respeitando a versão mínima da Constituição e suportando temperatura `0.0`, timeout de 15 segundos e Tool Calling).
- **FR-005**: O sistema DEVE permitir selecionar o provedor ativo por variável de ambiente (ex: `LLM_PROVIDER`, tendo `deepseek` ou `gemini` como opções suportadas) ou substituir a fábrica de injeção em código/testes.
- **FR-006**: O mecanismo de **Closure Pattern** (`pecas_capturadas` preenchido diretamente a partir da consulta ao ERP durante a execução da tool) DEVE permanecer centralizado no serviço de domínio, garantindo zero alucinação numérica em qualquer provedor injetado.
- **FR-007**: Os adaptadores de provedores DEVEM traduzir falhas específicas de seus clientes/SDKs para exceções de domínio agnósticas (ex: `LLMTimeoutError` e `LLMProviderError`), permitindo que a camada HTTP retorne `504` e `502` sem acoplamento a bibliotecas externas.
- **FR-008**: A validação de inicialização (lifespan fail-fast) DEVE verificar a presença da chave de API correspondente ao provedor selecionado (ex: `DEEPSEEK_API_KEY` quando `deepseek` estiver ativo, ou `GEMINI_API_KEY` quando `gemini` estiver ativo), sem exigir credenciais de provedores não utilizados.

### Key Entities

- **LLMProvider (Contrato / Interface)**: Abstração que define a operação de geração assistida por ferramentas para qualquer motor de IA.
- **DeepSeekProvider (Adaptador Concreto)**: Implementação do contrato `LLMProvider` para integração com a API da DeepSeek, incluindo orquestração do ciclo de chamada de função (`tool_calls`).
- **GeminiProvider (Adaptador Concreto)**: Implementação do contrato `LLMProvider` para integração com a API do Google Gemini.
- **Exceções de Domínio de IA (`LLMProviderError`, `LLMTimeoutError`)**: Entidades de erro agnósticas de fornecedor utilizadas para comunicação padronizada de falhas entre os adaptadores e a camada de apresentação HTTP.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos cenários de negócio existentes (match exato, pergunta ambígua com múltiplos SKUs, conflito catálogo vs. ERP, guardrail fora de escopo e validação 422) devem passar sem regressão utilizando tanto o adaptador `deepseek` quanto o adaptador `gemini`.
- **SC-002**: A troca entre provedores (`deepseek` <-> `gemini`) deve exigir **zero linhas de código alteradas** nos arquivos de rota HTTP, contratos de entrada/saída (`schemas.py`) e banco de dados (`database.py`).
- **SC-003**: 100% das chamadas aos provedores devem respeitar o limite de timeout de 15 segundos e temperatura `0.0`, mantendo 0% de alucinação nos metadados numéricos de `pecas_encontradas`.
- **SC-004**: A camada de rota (`main.py`) e a orquestração de domínio (`agent.py`) devem ter zero importações diretas de SDKs específicos de fornecedores de IA (toda comunicação ocorre via abstração injetada).

## Assumptions

- A API da DeepSeek segue o protocolo padrão compatível com OpenAI Chat Completions (`https://api.deepseek.com`, modelo padrão `deepseek-chat`) com suporte nativo a Function/Tool Calling.
- O provedor padrão quando `LLM_PROVIDER` não for especificado ou quando `DEEPSEEK_API_KEY` estiver presente será configurável via arquivo `.env`.
- O contrato público da API (`POST /consultar-peca`, `ConsultaRequest` e `ConsultaResponse`) permanece inalterado para não quebrar clientes consumidores (Frontend / n8n).
