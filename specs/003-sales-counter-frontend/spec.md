# Feature Specification: Sistema Web de Balcão de Vendas AI-First (AutoParts Sales Counter Frontend)

**Feature Branch**: `003-sales-counter-frontend`

**Created**: 2026-10-22

**Status**: Ready for Planning

**Input**: User description: "construir a interface Web/Frontend (React + Tailwind + shadcn/ui) para transformar essa API em um sistema completo de balcão de vendas. Deve ter uma parte que é o principal para consultar com IA ao invés de olhar a tabela."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Central de Consulta Inteligente com IA como Protagonista do Balcão (Priority: P1)

Como um vendedor de balcão de autopeças,
quero que a área principal e central da tela seja o **Assistente Inteligente de Consulta por IA** (em vez de uma grade/tabela tradicional de ERP), onde eu simplesmente digito o que o cliente pediu em linguagem natural e recebo a resposta direta da IA acompanhada de cartões de ação rápida das peças identificadas,
para que meu atendimento seja focado na conversa ágil assistida por IA, sem precisar procurar códigos ou filtrar tabelas manualmente.

**Why this priority**: É a essência do produto (AI-First). O diferencial do sistema é substituir a busca manual em tabelas complexas de catálogo pela consulta direta à IA como elemento principal da interface.

**Independent Test**: Abrir a aplicação e verificar que a área principal em destaque é o **Console de Consulta com IA** (input de destaque + timeline/feed de respostas da IA). Enviar uma pergunta (ex: "Preciso do amortecedor dianteiro do Gol G5 2012 1.0, tem no estoque?") e verificar que a resposta da IA aparece em primeiro plano, acompanhada dos mini-cards acionáveis das peças (`pecas_encontradas`) com badge de estoque e botão direto de adicionar ao orçamento.

**Acceptance Scenarios**:

1. **Given** que o vendedor acessa o sistema, **When** a tela carrega, **Then** o componente principal e de maior destaque visual é a **Central de Consulta com IA** (com barra de comando/pergunta em linguagem natural, sugestões rápidas de perguntas e área de resposta conversacional da IA), e não uma listagem tabular estática.
2. **Given** que o vendedor envia `"Preciso do amortecedor dianteiro do Gol G5 2012 1.0, tem no estoque?"`, **When** a IA responde, **Then** a resposta da IA é exibida em destaque principal e, logo abaixo da mensagem, as peças identificadas (`pecas_encontradas`) aparecem como cartões compactos de ação (mostrando SKU, badge `Em Estoque: 12 un.`, preço `R$ 250,00` e botão `+ Orçamento`).
3. **Given** que o vendedor digita menos de 3 caracteres ou mais de 500 caracteres no campo da IA, **When** tenta enviar, **Then** a validação instantânea do formulário (React Hook Form + Zod) bloqueia o envio e orienta o usuário imediatamente.

---

### User Story 2 - Montagem de Orçamento Rápido Integrado às Respostas da IA (Priority: P2)

Como um vendedor de balcão,
quero clicar em "Adicionar ao Orçamento" diretamente nas peças que a IA encontrou durante a conversa,
para consolidar em uma coluna lateral os itens que o cliente decidiu levar, ajustando quantidades até o limite do estoque do ERP e gerando o resumo final da venda.

**Why this priority**: Conecta a descoberta feita pela IA diretamente ao fechamento da venda no balcão.

**Independent Test**: A partir da resposta da IA, clicar em "+ Orçamento" na peça disponível (`AMOR-G5-01`), verificar sua inclusão automática no painel lateral de orçamento, alterar a quantidade respeitando o teto de 12 unidades e copiar o resumo do pedido.

**Acceptance Scenarios**:

1. **Given** que a IA retornou uma peça com `em_estoque: true` (`AMOR-G5-01`), **When** o vendedor clica em "Adicionar ao Orçamento" no card da resposta da IA, **Then** o item entra imediatamente no painel lateral de orçamento com cálculo automático de subtotal e total em Reais (`R$`).
2. **Given** que a IA retornou uma peça sem estoque (`AMOR-G5-02`, saldo `0`) ou sem cadastro no ERP (`VELA-UNO-11`, `preco: null`), **When** o card é exibido junto à resposta da IA, **Then** o badge indica claramente a indisponibilidade e o botão de adicionar ao orçamento fica desabilitado.

---

### User Story 3 - Histórico de Conversas/Consultas da Sessão e Sugestões de Prompt (Priority: P3)

Como um vendedor no balcão,
quero ver o fio das consultas feitas à IA durante o atendimento (ou clicar em sugestões de perguntas prontas quando o chat estiver vazio),
para consultar várias peças seguidas para o mesmo cliente mantendo o contexto visual do atendimento.

**Why this priority**: Mantém a fluidez de um assistente de IA moderno, permitindo fazer várias perguntas em sequência na área principal e limpar/iniciar novo atendimento quando outro cliente chega ao balcão.

**Independent Test**: Clicar em uma sugestão rápida no estado inicial vazio, fazer uma segunda pergunta em seguida e verificar que ambas ficam visíveis na linha do tempo da consulta com IA, com opção de "Limpar / Novo Atendimento".

**Acceptance Scenarios**:

1. **Given** que a Central de IA está sem consultas (Empty State), **When** o vendedor visualiza a área principal, **Then** são exibidos chips clicáveis de perguntas reais ("Amortecedor dianteiro Gol G5 2012", "Amortecedores Gol G5 2011", "Pastilha de freio Civic G10", "Jogo de velas Novo Uno 2012") para acionar a IA com 1 clique.

---

### User Story 4 - Tratamento Semântico de Erros da IA e Status de Conexão (Priority: P4)

Como vendedor utilizando o assistente de IA,
quero que eventuais timeouts (504) ou instabilidades do provedor de IA (502) apareçam de forma clara dentro da própria área de consulta da IA com um botão imediato de "Tentar Novamente",
para que eu possa repetir a pergunta com 1 clique sem precisar redigitá-la.

**Why this priority**: Mantém a experiência focada no fluxo do assistente e protege o vendedor contra falhas de rede ou sobrecarga externa.

**Independent Test**: Simular erro 502/504 na API e verificar a renderização do alerta de erro na área da IA com o botão "Tentar Novamente" reenviando o último prompt.

**Acceptance Scenarios**:

1. **Given** que uma consulta à IA falha com HTTP 502 ou 504, **When** o erro é recebido, **Then** a Central de IA exibe um alerta semântico explicativo com botão "Tentar Novamente" e preserva o orçamento lateral intacto.

---

### Edge Cases

- **Foco em IA vs. Tabela**: No prompt do backend (`agent.py`) e na renderização do frontend, a resposta textual da IA deve ser limpa, conversacional e direta, pois os metadados estruturados (`pecas_encontradas`) já são renderizados automaticamente pelo frontend como **Action Cards** elegantes do `shadcn/ui` anexados à resposta da IA — eliminando a necessidade de tabelas brutas.
- **CORS entre Frontend e Backend**: Configuração de `CORSMiddleware` no FastAPI (`autoparts-ai/main.py`) para permitir chamadas da aplicação React.
- **Peça sem Cadastro no ERP (`preco: null`)**: Exibir `"Sem cadastro no ERP"` no card da peça em vez de `R$ 0,00`.
- **Trava de Estoque Máximo**: O orçamento nunca permite selecionar mais unidades do que o saldo físico retornado pelo ERP.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A interface DEVE ter como área principal e central (protagonista) a **Central de Consulta com IA** (layout estilo Assistente/Copilot de Balcão), evitando tabelas estáticas de ERP como visão primária.
- **FR-002**: O campo de pergunta à IA DEVE ser validado com **React Hook Form + Zod** (`min=3`, `max=500`, `trim`), com suporte a envio por tecla `Enter` e chips de sugestões rápidas no estado vazio.
- **FR-003**: O sistema DEVE possuir camada de `services` dedicada para comunicação com `POST /consultar-peca`, tratando estados de `loading` (skeletons indicando que a IA está consultando o catálogo e o ERP), `error` (`422`, `502`, `504`, `500`), `empty` e `success`.
- **FR-004**: Cada resposta da IA na área principal DEVE exibir:
  1. A síntese comercial direta em linguagem natural gerada pela IA.
  2. Os **Cards de Peças Encontradas** (`pecas_encontradas`) integrados logo abaixo da resposta da IA, contendo SKU copiável, nome da peça, Badge semântico (`Em Estoque`, `Sem Estoque` ou `Sem Cadastro no ERP`), preço em `R$` e botão `+ Adicionar ao Orçamento`.
- **FR-005**: O prompt do agente no backend (`autoparts-ai/agent.py`) DEVE ser ajustado para responder de forma direta, objetiva e sem perguntas finais desnecessárias, sem precisar desenhar tabelas ASCII/Markdown repetitivas quando o frontend já exibe os cards estruturados (ou mantendo formatação limpa e escaneável).
- **FR-006**: O painel lateral de **Orçamento Rápido** DEVE permitir adicionar peças vindas das respostas da IA, incrementar/decrementar quantidades (respeitando o limite `quantidade` do ERP), calcular subtotais/total e copiar o resumo do orçamento.
- **FR-007**: A API FastAPI (`autoparts-ai/main.py`) DEVE habilitar `CORSMiddleware` para permitir requisições do frontend React.

### Key Entities

- **InteracaoIA (Mensagem de Consulta)**: Representa cada par de pergunta do vendedor + resposta da IA + lista de `PecaERP` associada na linha do tempo da Central de IA.
- **ItemOrcamento**: Peça adicionada ao orçamento a partir da resposta da IA, com controle de quantidade máxima e subtotal.
- **ApiErrorState**: Estrutura tipada representando erros HTTP (`status`, `title`, `detail`, `canRetry`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Central de Consulta com IA ocupa a área nobre principal da interface (≥ 65% da largura em desktop), permitindo que 100% da jornada de busca e adição ao orçamento seja feita diretamente pela conversa com a IA.
- **SC-002**: 100% das validações de entrada (<3 ou >500 caracteres) ocorrem instantaneamente via Zod antes do envio à API.
- **SC-003**: Zero uso de `any` em TypeScript, componentização modular com `shadcn/ui` + Tailwind CSS e tratamento completo de loading, erro, vazio e sucesso.

## Assumptions

- O projeto frontend será criado em `autoparts-web/` com React + Vite + TypeScript + Tailwind CSS + componentes `shadcn/ui` + `react-hook-form` + `zod` + `lucide-react`.
