# Contract Specification: Minimalist Frontend <-> FastAPI Backend

## 1. Configuração de Ambiente (`autoparts-web/.env.example`)

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | URL base da API FastAPI |

## 2. Mapeamento Semântico de Estados de Erro (`autopartsService.ts`)

| HTTP Status | Título Exibido na UI | `canRetry` | Comportamento |
|---|---|---|---|
| `422` | Entrada Inválida | `false` | Exibe detalhe de validação |
| `502` | Provedor de IA Indisponível | `true` | Exibe alerta com botão "Tentar Novamente" |
| `504` | Tempo Limite Excedido (Timeout) | `true` | Exibe alerta informando os 15s e botão "Tentar Novamente" |
| `500` / `0` | Erro de Comunicação com o Servidor | `true` | Exibe alerta de conexão com botão "Tentar Novamente" |

## 3. Regras de Renderização dos Mini-Cards de Peça (`PecaActionCard.tsx`)

| Condição do Item (`PecaERP`) | Badge Exibido | Variante Visual | Preço Exibido | Botão `+ Orçamento` |
|---|---|---|---|---|
| `em_estoque === true` | `Em estoque (${quantidade} un.)` | Emerald / Success | `R$ XX,XX` | Habilitado |
| `em_estoque === false` e `preco !== null` | `Sem estoque (0 un.)` | Destructive / Red | `R$ XX,XX` | Desabilitado |
| `preco === null` | `Sem cadastro no ERP` | Secondary / Muted | `Sob consulta` | Desabilitado |
