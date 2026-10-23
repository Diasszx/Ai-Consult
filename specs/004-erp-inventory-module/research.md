# Phase 0: Research & Technical Decisions - Módulo de Estoque ERP + Sidebar Minimalista

## Decision 1: Persistência Desacoplada no SQLite com Sincronização em Tempo Real para a IA
- **Decisão**: Persistir o catálogo técnico em uma tabela própria `catalogo_pecas` (`sku`, `nome_peca`, `marca`, `aplicacao`) separada da tabela operacional `estoque_erp` (`sku`, `preco`, `quantidade`) no mesmo arquivo `erp.db`. Ambas são inicializadas com o seed data original no `init_db()`.
- **Justificativa**:
  1. **Respeita 100% a Constituição (Princípio III — Desacoplamento Catálogo vs. ERP)**: a tabela `estoque_erp` continua contendo estritamente `sku`, `preco` e `quantidade`.
  2. **Sincronização Imediata com a IA**: Ao criar a função `obter_catalogo_tecnico_atual()` que lê `catalogo_pecas` do SQLite a cada chamada de `processar_consulta_agente()`, qualquer peça adicionada, editada ou excluída no módulo **Estoque** passa a ser conhecida pela IA instantaneamente na próxima pergunta feita na aba **Consulta**, sobrevivendo inclusive a reinicializações do servidor.
  3. **Preservação do Cenário de Conflito (Catálogo vs. ERP)**: O `LEFT JOIN` entre `catalogo_pecas` e `estoque_erp` permite listar itens como `VELA-UNO-11` (presente no catálogo, mas sem preço/saldo no ERP) e permite que o gestor de estoque clique em "Editar" na tabela do ERP para cadastrar preço e saldo para ele!

## Decision 2: Arquitetura de Navegação com Sidebar Minimalista (`AppSidebar.tsx`)
- **Decisão**: Implementar um layout de duas regiões principais (`flex min-h-screen`):
  - **Barra Lateral Esquerda (`AppSidebar.tsx`)**: Fixa e minimalista (`w-60` em desktop, barra compacta em mobile), com os 3 itens de navegação:
    1. `Consulta` (ícone `Sparkles` / `MessageSquare`) — **Ativa por padrão ao abrir a aplicação**.
    2. `Estoque` (ícone `Package`) — Abre o módulo gerencial de Estoque ERP (Tabela + CRUD).
    3. `Orçamentos` (ícone `FileText`, com badge contador de itens) — Exibe a visualização reservada para a próxima spec (mostrando o resumo rápido atual e aviso de módulo dedicado).
  - **Área de Conteúdo Principal (`flex-1`)**: Renderiza a visão ativa mantendo o estado da conversa com a IA preservado quando o usuário navega entre `Consulta` e `Estoque`.

## Decision 3: UX Minimalista para o CRUD de Estoque (`InventoryModule.tsx`)
- **Decisão**:
  - **Tabela Limpa (`shadcn/ui` Table)**: Colunas `SKU`, `Peça / Marca`, `Aplicação`, `Preço Unitário`, `Saldo / Status` e `Ações` (`Editar`, `Excluir`).
  - **Busca Instantânea**: Barra de filtro no topo da tabela para filtrar por SKU, nome, marca ou veículo.
  - **Modal / Dialog de Cadastro e Edição (`InventoryItemModal.tsx`)**: Formulário único reutilizável validado com **React Hook Form + Zod** (`sku`, `nome_peca`, `marca`, `aplicacao`, `preco`, `quantidade`). No modo edição, o campo `sku` fica somente leitura.
  - **Exclusão Segura**: Confirmação rápida antes de disparar `DELETE /estoque/{sku}` com feedback de loading no botão.
