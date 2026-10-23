# Quickstart & Validation Guide: Módulo de Estoque ERP + Sincronização com IA

## 1. Verificar a Barra Lateral e a Tela Inicial
1. Acesse **`http://localhost:5173`**.
2. Observe a **Barra Lateral (Sidebar)** à esquerda com os 3 módulos:
   - **Consulta** (selecionado por padrão ao abrir — tela de conversa com a IA)
   - **Estoque**
   - **Orçamentos**

## 2. Testar o CRUD no Módulo Estoque + Reflexo na IA
1. Na barra lateral, clique em **Estoque**.
2. Veja a tabela listando todas as peças atuais (`AMOR-G5-01`, `AMOR-G5-02`, `FILT-COR-15`, `PAST-CIV-10`, `VELA-UNO-11`).
3. **Teste de Edição**:
   - Clique em **Editar** na peça `AMOR-G5-02` (que estava com estoque `0`).
   - Altere a quantidade para `15` e o preço para `195.00` e clique em **Salvar**.
4. **Teste de Adição**:
   - Clique em **+ Novo Item**.
   - Cadastre:
     - SKU: `BATE-ONIX-20`
     - Nome: `Bateria 60Ah Selada`
     - Marca: `Moura`
     - Aplicação: `Chevrolet Onix 2020 a 2024`
     - Preço: `480.00`
     - Quantidade: `6`
5. **Teste de Consulta na IA após Alterações**:
   - Clique em **Consulta** na barra lateral.
   - Pergunte à IA: `"Tem bateria pro Onix 2022 e amortecedor traseiro do Gol G5?"`.
   - Veja a IA responder em tempo real com a nova bateria `BATE-ONIX-20` (6 un. por R$ 480,00) e o amortecedor traseiro `AMOR-G5-02` agora com 15 unidades por R$ 195,00!
