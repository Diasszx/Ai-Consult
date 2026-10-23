# Feature Specification: Módulo de Orçamentos por Cliente (Customer Budgets ERP Module)

**Feature Branch**: `005-customer-budgets-module`

**Created**: 2026-10-22

**Status**: Ready for Planning

**Input**: User description: "agora a respeito do orçamento ele será por cliente então ao confirmar orçar e confirmar orçamento será pedido dados como Nome, numero, etc.. o orçamento será por cliente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirmação de Orçamento com Identificação do Cliente (Priority: P1)

Como um vendedor de balcão,
quero que, após selecionar as peças (clicando em `+ Orçar`) e clicar em **"Confirmar Orçamento"**, o sistema solicite os dados do cliente (**Nome**, **Telefone / WhatsApp**, **Veículo / Placa** e **Observações**) em um modal validado,
para que cada orçamento fique registrado no banco de dados vinculado nominalmente ao cliente atendido.

**Why this priority**: Atende diretamente à regra central de negócio solicitada: todo orçamento confirmado deve pertencer a um cliente identificado com nome e telefone de contato.

**Independent Test**:
1. Na tela `Consulta`, buscar uma peça com a IA e clicar em `+ Orçar`.
2. No painel de orçamento em andamento, clicar em **"Confirmar Orçamento"**.
3. Preencher os dados do cliente no modal (`Nome: Carlos Mendes`, `Telefone: (11) 98765-4321`, `Veículo: Gol G5 2012`) e confirmar.
4. Verificar que o orçamento é salvo no banco de dados SQLite (`POST /orcamentos`), o rascunho atual é limpo e o orçamento passa a aparecer na aba **Orçamentos** da barra lateral.

**Acceptance Scenarios**:

1. **Given** que o vendedor adicionou uma ou mais peças ao rascunho de orçamento, **When** ele clica em "Confirmar Orçamento", **Then** o sistema abre um modal solicitando os dados do cliente (`Nome`, `Telefone/WhatsApp`, `Veículo/Placa` e `Observações`) juntamente com o resumo do valor total.
2. **Given** que o vendedor tenta confirmar o formulário sem preencher o Nome ou o Telefone do cliente, **When** ele clica em salvar, **Then** a validação no cliente (**React Hook Form + Zod**) bloqueia o envio e destaca os campos obrigatórios.
3. **Given** que os dados do cliente são válidos, **When** o vendedor confirma o salvamento, **Then** o sistema grava o orçamento e seus itens no banco SQLite, limpa o rascunho da sessão atual e permite visualizar o orçamento salvo no módulo `Orçamentos`.

---

### User Story 2 - Gestão e Consulta de Orçamentos por Cliente na Aba "Orçamentos" (Priority: P1)

Como vendedor ou gerente de balcão,
quero acessar o módulo **Orçamentos** na barra lateral e visualizar todos os orçamentos salvos organizados por cliente (com filtro de busca por Nome do Cliente, Telefone, Veículo ou ID do orçamento), podendo expandir/visualizar os itens de cada orçamento e copiar o demonstrativo completo personalizado com os dados do cliente,
para acompanhar negociações abertas e enviar a proposta pelo WhatsApp.

**Why this priority**:Substitui o placeholder da barra lateral pelo módulo real e definitivo de **Orçamentos**, permitindo gerenciar o histórico comercial por cliente.

**Independent Test**:
Acessar a aba `Orçamentos` na barra lateral, filtrar pelo nome do cliente (`Carlos Mendes`), visualizar o card/linha do orçamento com data, telefone, veículo, lista de peças (`SKU`, quantidade, unitário, subtotal), valor total e clicar em "Copiar para WhatsApp".

**Acceptance Scenarios**:

1. **Given** que existem orçamentos salvos no banco de dados, **When** o usuário clica em `Orçamentos` na barra lateral, **Then** o sistema lista todos os orçamentos do mais recente para o mais antigo exibindo Código (`#ORC-...`), Nome do Cliente, Telefone, Veículo, Status, Valor Total e itens detalhados.
2. **Given** que o vendedor digita o nome ou telefone de um cliente na barra de filtro do módulo `Orçamentos`, **When** a filtragem ocorre, **Then** apenas os orçamentos daquele cliente são exibidos instantaneamente.
3. **Given** um orçamento listado, **When** o vendedor clica em "Copiar Orçamento", **Then** o texto copiado para a área de transferência inclui o cabeçalho com Nome do Cliente, Telefone, Veículo, todas as peças orçadas e o Total Geral em `R$`.

---

### User Story 3 - Ciclo de Vida do Orçamento (Aprovação com Baixa de Estoque, Cancelamento e Exclusão) (Priority: P2)

Como operador do ERP,
quero poder atualizar o status de um orçamento de cliente (`Pendente` -> `Aprovado` ou `Cancelado`) ou excluí-lo, sendo que ao **Aprovar** um orçamento o sistema desconta automaticamente as quantidades vendidas na tabela `estoque_erp` do banco SQLite,
para que o estoque físico e as consultas futuras da IA já reflitam a saída das peças aprovadas pelo cliente.

**Why this priority**: Integra os três módulos do sistema (**Consulta IA**, **Orçamentos** e **Estoque**): quando o cliente fecha o orçamento, aprová-lo já atualiza o saldo no ERP e na IA!

**Independent Test**:
Criar um orçamento para o cliente com `2 unidades` de `AMOR-G5-01` (que tinha 12 unidades em estoque). Clicar em "Aprovar Orçamento". Verificar que o status muda para `Aprovado` e que no módulo `Estoque` (e na `Consulta` da IA) o saldo de `AMOR-G5-01` passou a ser `10 unidades`.

**Acceptance Scenarios**:

1. **Given** um orçamento com status `Pendente`, **When** o vendedor clica em "Aprovar Orçamento" e há saldo suficiente no estoque, **Then** o sistema altera o status para `Aprovado` e deduz a quantidade de cada item na tabela `estoque_erp` em uma transação atômica.
2. **Given** um orçamento com status `Pendente` cuja peça ficou sem saldo suficiente no estoque antes da aprovação, **When** o vendedor tenta aprová-lo, **Then** o sistema retorna erro `409 Conflict` informando qual SKU não possui saldo suficiente e mantém o orçamento como `Pendente`.
3. **Given** um orçamento existente, **When** o vendedor clica em "Cancelar" ou "Excluir", **Then** o registro é atualizado ou removido do banco de dados SQLite.

---

### Edge Cases

- **Tentativa de Confirmar Orçamento Vazio**: O botão "Confirmar Orçamento" só é exibido/habilitado quando há pelo menos 1 item válido no rascunho.
- **Formato de Telefone / Contato**: Aceitar formatos brasileiros comuns com ou sem máscara (ex: `11987654321` ou `(11) 98765-4321`), validando tamanho mínimo de 8 dígitos/caracteres.
- **Concorrência de Estoque na Aprovação**: Se o estoque foi alterado no módulo `Estoque` antes da aprovação do orçamento, a aprovação valida o saldo real no SQLite antes de efetivar a baixa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O painel de orçamento rápido na tela de `Consulta` DEVE exibir o botão **"Confirmar Orçamento"**, que abre um modal solicitando os dados do cliente.
- **FR-002**: O formulário de confirmação de orçamento do cliente DEVE ser validado com **React Hook Form + Zod**, exigindo:
  - `cliente_nome` (obrigatório, mín. 2 caracteres, máx. 120)
  - `cliente_telefone` (obrigatório, mín. 8 caracteres, máx. 30)
  - `cliente_veiculo` (opcional, máx. 120, ex: modelo/ano/placa)
  - `observacoes` (opcional, máx. 300)
- **FR-003**: O banco de dados SQLite (`autoparts-ai/database.py`) DEVE persistir os orçamentos nas tabelas `orcamentos` (dados do cliente, status, valor total, data de criação) e `orcamento_itens` (SKU, nome da peça, preço unitário, quantidade, subtotal).
- **FR-004**: O backend FastAPI (`autoparts-ai/main.py`) DEVE disponibilizar os endpoints REST:
  - `POST /orcamentos`: Cria e salva um novo orçamento vinculado ao cliente (`201 Created`).
  - `GET /orcamentos`: Lista todos os orçamentos salvos com seus respectivos itens (`200 OK`).
  - `PATCH /orcamentos/{orcamento_id}/status`: Altera o status para `aprovado` (realizando baixa atômica no `estoque_erp`) ou `cancelado`.
  - `DELETE /orcamentos/{orcamento_id}`: Exclui um orçamento do banco de dados.
- **FR-005**: O módulo `Orçamentos` na barra lateral (`BudgetsView.tsx`) DEVE listar todos os orçamentos por cliente, com busca instantânea por nome/telefone/veículo, exibição dos itens, botão de copiar proposta personalizada para o cliente e botões de Aprovar, Cancelar e Excluir.

### Key Entities

- **OrcamentoCliente (`OrcamentoResponse`)**: Representa o orçamento salvo de um cliente (`id`, `codigo`, `cliente_nome`, `cliente_telefone`, `cliente_veiculo`, `observacoes`, `status`, `valor_total`, `criado_em`, `itens`).
- **OrcamentoItem (`OrcamentoItemSchema`)**: Representa cada peça dentro do orçamento (`sku`, `nome_peca`, `preco_unitario`, `quantidade`, `subtotal`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos orçamentos confirmados possuem identificação obrigatória do cliente (`cliente_nome` e `cliente_telefone`) persistida no banco SQLite.
- **SC-002**: 100% das aprovações de orçamento atualizam automaticamente o saldo de `estoque_erp`, refletindo imediatamente tanto na aba `Estoque` quanto nas respostas da IA na aba `Consulta`.
- **SC-003**: Compilação TypeScript limpa (`strict: true`, zero `any`) e 100% da suíte `pytest` passando.

## Assumptions

- O rascunho em andamento (enquanto o vendedor ainda está escolhendo peças na aba `Consulta`) continua usando o hook `useOrcamento` em memória/`localStorage`, e ao clicar em **"Confirmar Orçamento"** e preencher os dados do cliente, ele é persistido definitivamente no SQLite e o rascunho local é zerado para o próximo atendimento.
