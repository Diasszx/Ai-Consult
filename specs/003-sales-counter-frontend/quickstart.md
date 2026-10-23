# Quickstart & Validation Guide: Minimalist AI Sales Counter Frontend

## Pré-requisitos
- Node.js 18+ e npm instalados
- Backend FastAPI (`autoparts-ai`) rodando em `http://127.0.0.1:8000`

## 1. Subir o Backend (Terminal 1)
```powershell
cd autoparts-ai
$env:LLM_PROVIDER="deepseek"
$env:DEEPSEEK_API_KEY="sk-sua_chave_deepseek_aqui"
.\.venv\Scripts\uvicorn.exe main:app --reload
```

## 2. Instalar e Subir o Frontend (Terminal 2)
```powershell
cd autoparts-web
npm install
npm run dev
```
Acesse no navegador: **`http://localhost:5173`**

---

## 3. Roteiro de Validação da Interface Minimalista

1. **Estado Vazio Minimalista**:
   - Verifique o campo de busca da IA centralizado com foco automático e os chips discretos de sugestões rápidas logo abaixo.
2. **Consulta com IA (Protagonista)**:
   - Clique em `"Amortecedor dianteiro Gol G5 2012"` ou digite sua pergunta e pressione `Enter`.
   - Observe o skeleton minimalista de carregamento e, em seguida, a **resposta direta da IA** em destaque acompanhada do mini-card da peça `AMOR-G5-01` (sem tabelas pesadas).
3. **Orçamento Rápido Discreto**:
   - Clique em `+ Orçamento` no card da peça `AMOR-G5-01`.
   - Veja o painel enxuto de orçamento atualizar o contador, ajuste a quantidade (limitada a 12 unidades) e clique em `"Copiar Orçamento"`.
4. **Validação Zod Instantânea**:
   - Digite `"Oi"` e tente buscar: a validação exibe a mensagem instantânea sem chamar o servidor.
