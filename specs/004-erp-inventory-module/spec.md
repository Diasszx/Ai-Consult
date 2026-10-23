# Feature Specification: Navegação Lateral e Módulo de Gestão de Estoque ERP Sincronizado com IA

**Feature Branch**: `004-erp-inventory-module`

**Created**: 2026-10-22

**Status**: Ready for Planning

**Input**: User description: "vamos o estoque. Vamos fazer uma tabela listando todos os itens do estoque. Nesse modulo poderá fazer igual um erp: editar, excluir e adicionar novo item ao estoque. Isso atualizará o banco. e a IA deverá conseguir consultar corretamente depois de feito alterações. Você irá adicionar uma barra lateral. A tela inicial será a conversa com a IA na barra lateral terá a tela inicial(conversa com ia) Consulta, Estoque, Orçamentos. O módulo de orçamentos será desenvolvido em outra spec"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegação Lateral Minimalista (Consulta, Estoque e Orçamentos) com Tela Inicial na IA (Priority: P1)

Como operador/vendedor do sistema,
quero uma barra lateral (Sidebar) minimalista contendo os módulos **Consulta**, **Estoque** e **Orçamentos**, tendo a tela **Consulta** (conversa com a IA) como tela inicial padrão ao abrir o sistema,
para que eu possa alternar rapidamente entre o atendimento inteligente com IA e o gerenciamento operacional do estoque sem sair da aplicação.

**Why this priority**: Estrutura a navegação base do sistema ERP completo mantendo a conversa com a IA como tela principal de abertura.

**Independent Test**: Abrir a aplicação e verificar que a Sidebar exibe os 3 itens (`Consulta`, `Estoque`, `Orçamentos`), que `Consulta` inicia ativa por padrão, que clicar em `Estoque` abre a tabela gerencial do ERP e que clicar em `Orçamentos` exibe a área reservada para a próxima especificação.

**Acceptance Scenarios**:

1. **Given** que o usuário acessa a aplicação pela primeira vez, **When** a interface é carregada, **Then** a barra lateral está visível com `Consulta` selecionado por padrão, exibindo a conversa com a IA como tela inicial.
2. **Given** que o usuário está em qualquer módulo, **When** ele clica em `Estoque` na barra lateral, **Then** a área principal alterna imediatamente para a visão tabular de gerenciamento de estoque do ERP.
3. **Given** que o módulo completo de Orçamentos será detalhado em outra spec, **When** o usuário clica em `Orçamentos` na barra lateral, **Then** o sistema exibe a visualização base/placeholder de Orçamentos sem erros de navegação.

---

### User Story 2 - Listagem Tabular, Adição, Edição e Exclusão de Itens no Estoque (CRUD ERP) (Priority: P1)

Como gestor de estoque ou vendedor de balcão,
quero visualizar todos os itens cadastrados em uma tabela estilo ERP (exibindo SKU, Nome da Peça, Marca, Aplicação Veicular, Preço Unitário, Quantidade e Status) e poder **adicionar novos itens**, **editar itens existentes** (preço, saldo, nome, marca, aplicação) e **excluir itens**, persistindo todas as alterações diretamente no banco de dados SQLite,
para manter o inventário e o catálogo da loja atualizados em tempo real.

**Why this priority**: É a funcionalidade central desta especificação, permitindo operar o sistema como um ERP real com persistência no banco de dados.

**Independent Test**:
1. Acessar `Estoque` e verificar a tabela listando os itens atuais.
2. Clicar em "Novo Item", preencher o formulário validado (ex: `SKU: BATE-ONIX-20`, `Bateria 60Ah`, `Moura`, `Chevrolet Onix 2020 a 2024`, `R$ 480,00`, `5 unidades`) e salvar -> verificar que aparece na tabela.
3. Clicar em "Editar" em um item (ex: alterar a quantidade de `AMOR-G5-02` de `0` para `10` ou mudar seu preço) -> verificar atualização imediata no banco e na tabela.
4. Clicar em "Excluir" em um item -> verificar que ele é removido do banco e da tabela.

**Acceptance Scenarios**:

1. **Given** que o usuário está na tela `Estoque`, **When** a tela carrega, **Then** uma tabela limpa lista todos os itens com SKU, Nome, Marca, Aplicação, Preço formatado em `R$`, Quantidade em estoque, Badge de status e botões de ação (`Editar` e `Excluir`).
2. **Given** que o usuário clica em "Adicionar Item" e preenche os dados válidos no formulário (validado com React Hook Form + Zod), **When** ele confirma o cadastro, **Then** o item é persistido no banco de dados SQLite e exibido imediatamente na tabela de estoque.
3. **Given** um item existente na tabela, **When** o usuário clica em "Editar", altera o preço ou a quantidade e salva, **Then** o registro é atualizado no banco de dados SQLite e refletido na listagem.
4. **Given** um item existente na tabela, **When** o usuário aciona "Excluir" e confirma a operação, **Then** o item é removido do banco de dados SQLite e desaparece da listagem.

---

### User Story 3 - Sincronização Imediata entre Alterações de Estoque e Consultas da IA (Priority: P1)

Como vendedor que utiliza o Assistente de IA no balcão,
quero que qualquer peça adicionada, editada ou excluída no módulo **Estoque** seja imediatamente reconhecida (ou deixe de existir) quando eu fizer uma pergunta na tela **Consulta** com a IA,
para que a IA sempre trabalhe sobre os dados reais e atualizados do banco de dados, sem depender de listas estáticas desatualizadas.

**Why this priority**: Garante a integridade ponta a ponta entre o ERP e a IA. Se o estoquista cadastrar uma peça nova ou repor o estoque de uma peça zerada, a IA precisa saber disso no segundo seguinte.

**Independent Test**:
1. No módulo `Estoque`, adicionar uma peça nova (ex: `BATE-ONIX-20` - Bateria para Onix 2022 com 5 unidades a R$ 480,00) ou alterar o saldo do `AMOR-G5-02` de `0` para `15`.
2. Ir na barra lateral para `Consulta` e perguntar à IA: `"Tem bateria pro Onix 2022?"` ou `"Tem amortecedor traseiro do Gol G5?"`.
3. Validar que a IA encontra a nova peça (ou o novo saldo de 15 unidades) e retorna os valores exatos recém-salvos no banco.

**Acceptance Scenarios**:

1. **Given** que um novo item foi adicionado no módulo `Estoque`, **When** o usuário vai até a aba `Consulta` e pergunta sobre esse item para a IA, **Then** o catálogo dinâmico injetado no prompt da IA já contém o novo item e a tool `buscar_dados_erp` retorna o preço e quantidade recém-cadastrados no SQLite.
2. **Given** que o preço ou a quantidade de um item existente foi editado no módulo `Estoque`, **When** o usuário consulta a peça na IA, **Then** a IA e os mini-cards informam exatamente o novo preço e a nova quantidade.
3. **Given** que um item foi excluído no módulo `Estoque`, **When** o usuário pergunta por ele na IA, **Then** a IA informa que o item não consta no catálogo/estoque da loja.

---

### Edge Cases

- **Tentativa de Cadastrar SKU Duplicado**: Se o usuário tentar adicionar um novo item com um código SKU que já existe no banco (ex: `AMOR-G5-01`), a API deve retornar `409 Conflict` e o frontend deve exibir a mensagem clara no formulário sem sobrescrever o item existente acidentalmente.
- **Normalização de SKU**: Códigos SKU digitados em letras minúsculas ou com espaços extras (ex: ` amor-g5-01 `) devem ser higienizados e convertidos para maiúsculas (`AMOR-G5-01`).
- **Valores Negativos**: Preço menor que zero ou quantidade negativa devem ser bloqueados tanto na validação Zod do frontend quanto no Pydantic v2 do backend (`ge=0`).
- **Preservação do Cenário de Conflito Catálogo vs. ERP**: O sistema deve continuar suportando itens que possuem definição técnica de catálogo mas estão com preço/quantidade nulos (`cadastrado_no_erp=false`, como `VELA-UNO-11` no seed inicial), permitindo inclusive que o usuário preencha o preço/estoque desse item pela tela de Edição do ERP para ativá-lo!

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A interface frontend DEVE apresentar uma barra lateral (Sidebar) minimalista contendo os itens de navegação:
  1. `Consulta` (tela inicial padrão ao abrir a aplicação — conversa com a IA)
  2. `Estoque` (módulo gerencial com tabela e CRUD do ERP)
  3. `Orçamentos` (item de navegação preparado para a futura spec)
- **FR-002**: O banco de dados SQLite (`autoparts-ai/database.py`) DEVE persistir tanto os atributos técnicos (`sku`, `nome_peca`, `marca`, `aplicacao`) quanto os operacionais (`preco`, `quantidade`), mantendo o desacoplamento lógico entre funções de catálogo e funções de estoque ERP e garantindo que alterações sobrevivam a reinicializações.
- **FR-003**: A API backend DEVE expor endpoints REST para gerenciamento do estoque:
  - `GET /estoque`: Lista todos os itens cadastrados ordenados por SKU.
  - `POST /estoque`: Adiciona um novo item ao banco (retornando `201 Created` ou `409 Conflict` se o SKU já existir).
  - `PUT /estoque/{sku}`: Atualiza os dados de um item existente (retornando `200 OK` ou `404 Not Found`).
  - `DELETE /estoque/{sku}`: Remove um item do banco (retornando `204 No Content` ou `200 OK`, ou `404 Not Found`).
- **FR-004**: O gerador de System Prompt do agente (`_montar_system_prompt()` em `autoparts-ai/agent.py`) e a closure `buscar_dados_erp` DEVEM ler os dados atualizados diretamente do banco SQLite a cada consulta, garantindo sincronização imediata com a IA após qualquer adição, edição ou exclusão.
- **FR-005**: O módulo `Estoque` no frontend DEVE exibir uma tabela (`shadcn/ui` Table) com filtro rápido de busca por texto (SKU, nome, marca ou veículo), indicadores visuais de estoque e ações de criar, editar e excluir.
- **FR-006**: Os formulários de Criação e Edição de item de estoque no frontend DEVEM utilizar **React Hook Form + Zod** com validação de campos obrigatórios (`sku`, `nome_peca`, `marca`, `aplicacao`, `preco >= 0`, `quantidade >= 0`).
- **FR-007**: O módulo `Estoque` DEVE tratar todos os estados de interface: `loading` (skeletons na tabela e spinner no salvamento), `empty` (nenhum item encontrado no filtro), `error` (alerta com retry) e `success`.

### Key Entities

- **ItemEstoqueCompleto (`EstoqueItem`)**: Entidade completa do ERP contendo `sku`, `nome_peca`, `marca`, `aplicacao`, `preco` (`float | None`), `quantidade` (`int | None`) e `em_estoque` (`bool`).
- **EstoqueCreatePayload / EstoqueUpdatePayload**: Contratos de entrada validados por Pydantic v2 (no backend) e Zod (no frontend) para criação e atualização de peças.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das alterações realizadas no módulo `Estoque` (criação, edição de preço/saldo ou exclusão) são imediatamente refletidas na resposta da IA na aba `Consulta`, sem necessidade de reiniciar o servidor.
- **SC-002**: A tela inicial ao abrir a aplicação é sempre a conversa com a IA (`Consulta`), com transição instantânea (<50ms) entre as abas da barra lateral (`Consulta`, `Estoque`, `Orçamentos`).
- **SC-003**: 100% dos testes automatizados existentes continuam passando, acrescidos dos novos testes dos endpoints `GET/POST/PUT/DELETE /estoque` e da sincronização dinâmica com a IA.

## Assumptions

- O item `Orçamentos` na barra lateral já ficará funcional na navegação, apresentando os itens atualmente adicionados ao orçamento rápido ou uma visão dedicada base que será expandida na especificação própria de Orçamentos.
