# Phase 0: Research & Technical Decisions - Módulo de Orçamentos por Cliente

## Decision 1: Modelagem Relacional SQLite para Orçamentos por Cliente (`orcamentos` + `orcamento_itens`)
- **Decisão**: Criar duas tabelas relacionais no SQLite (`erp.db`):
  1. `orcamentos`: `id` (`INTEGER PRIMARY KEY AUTOINCREMENT`), `cliente_nome` (`TEXT NOT NULL`), `cliente_telefone` (`TEXT NOT NULL`), `cliente_veiculo` (`TEXT`), `observacoes` (`TEXT`), `status` (`TEXT NOT NULL DEFAULT 'pendente'`), `valor_total` (`REAL NOT NULL`), `criado_em` (`TEXT NOT NULL`).
  2. `orcamento_itens`: `id` (`INTEGER PRIMARY KEY AUTOINCREMENT`), `orcamento_id` (`INTEGER NOT NULL`), `sku` (`TEXT NOT NULL`), `nome_peca` (`TEXT NOT NULL`), `preco_unitario` (`REAL NOT NULL`), `quantidade` (`INT NOT NULL`), `subtotal` (`REAL NOT NULL`).
- **Justificativa**: Garante integridade referencial, histórico comercial completo por cliente e permite que um orçamento tenha 1 ou N peças associadas.

## Decision 2: Fluxo de Confirmação com Modal de Dados do Cliente (`ConfirmBudgetModal.tsx`)
- **Decisão**: Quando o vendedor adiciona peças no rascunho da aba **Consulta** e clica em **"Confirmar Orçamento"** no `QuoteSummaryPanel`, abre-se o modal `ConfirmBudgetModal.tsx` validado com **React Hook Form + Zod** (`confirmarOrcamentoSchema`).
- **Campos solicitados**:
  - **Nome do Cliente** (obrigatório)
  - **Telefone / WhatsApp** (obrigatório)
  - **Veículo / Ano / Placa** (opcional)
  - **Observações** (opcional)
- Ao salvar, o frontend chama `POST /orcamentos`, limpa o rascunho local e redireciona automaticamente (ou exibe confirmação) para a aba **Orçamentos** da barra lateral, onde o orçamento recém-confirmado aparece no topo!

## Decision 3: Transação Atômica na Aprovação do Orçamento com Baixa de Estoque
- **Decisão**: Ao acionar `PATCH /orcamentos/{id}/status` com `status="aprovado"`:
  1. O sistema verifica se todos os itens daquele orçamento possuem saldo suficiente em `estoque_erp`.
  2. Se algum SKU não tiver saldo suficiente, retorna `409 Conflict` informando qual peça está em falta.
  3. Se houver saldo, desconta as quantidades em `estoque_erp` (`UPDATE estoque_erp SET quantidade = quantidade - ? WHERE sku = ?`) e atualiza `orcamentos.status = 'aprovado'` na mesma transação SQLite.
- **Justificativa**: Fecha o ciclo completo do ERP + IA: quando um cliente aprova o orçamento, o saldo físico diminui automaticamente tanto na tabela **Estoque** quanto nas consultas futuras da **IA**!
