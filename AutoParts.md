Specification Document (v2.0 — Final): AutoParts AI & ERP Integrator

1. Arquitetura Consolidada e Fluxo de Dados
Catálogo Técnico Desacoplado (RAG / Contexto): Dicionário em memória (CATALOGO_TECNICO em database.py) contendo sku, nome_peca, marca e aplicacao. Injetado no System Prompt (pronto para ser substituído pelo ChromaDB na Fase 2 sem tocar no schema do ERP).

ERP (SQLite Nativo): Tabela estoque_erp contendo estritamente dados operacionais: sku (TEXT PK), preco (REAL) e quantidade (INT). Inicializada com seed data via lifespan do FastAPI.

Execução Determinística (Closure Pattern):
- A rota síncrona def consultar_peca recebe o payload validado pelo Pydantic v2.
- Cria um buffer isolado na requisição (pecas_capturadas) e instancia a tool buscar_dados_erp(skus: list[str]) como uma closure.
- O SDK google-genai (gemini-2.5-flash, temperature=0.0, timeout de 15s) identifica os SKUs no catálogo técnico e invoca buscar_dados_erp automaticamente (Automatic Function Calling).
- A função consulta o sqlite3, popula pecas_capturadas diretamente do banco (eliminando risco de alucinação nos metadados numéricos) e devolve os dados para o Gemini redigir a resposta comercial.

2. Estrutura do Projeto
autoparts-ai/
├── main.py            # FastAPI app, lifespan, rota POST /consultar-peca e exception handlers
├── schemas.py         # Contratos Pydantic v2 (Entrada, Item do ERP e Saída)
├── database.py        # Setup do SQLite nativo, seed data e CATALOGO_TECNICO
├── agent.py           # Integração google-genai, System Prompt e factory da Tool
└── requirements.txt   # fastapi, uvicorn, pydantic, google-genai, python-dotenv

3. Contratos da API (schemas.py)
Request (POST /consultar-peca):
{
  "pergunta": "Preciso do amortecedor do Gol G5 2012 1.0, tem no estoque?"
}
Validação: min_length=3, max_length=500, str_strip_whitespace=True (Retorna 422 se inválido).

Response (200 OK):
{
  "status": "sucesso",
  "pecas_encontradas": [
    {
      "sku": "AMOR-G5-01",
      "nome_peca": "Amortecedor Dianteiro Turbogas",
      "em_estoque": true,
      "preco": 250.0,
      "quantidade": 12
    },
    {
      "sku": "AMOR-G5-02",
      "nome_peca": "Amortecedor Traseiro Turbogas",
      "em_estoque": false,
      "preco": 180.0,
      "quantidade": 0
    }
  ],
  "resposta": "Para o Gol G5 2012 1.0 temos duas opções no catálogo: o Amortecedor Dianteiro (SKU: AMOR-G5-01) por R$ 250,00 com 12 unidades em estoque, e o Amortecedor Traseiro (SKU: AMOR-G5-02) por R$ 180,00, que está sem estoque no momento."
}

Códigos de Erro HTTP:
- 422 Unprocessable Entity: Payload fora do padrão (vazio ou acima de 500 caracteres).
- 502 Bad Gateway: Falha de comunicação com a API do Gemini.
- 504 Gateway Timeout: Timeout ao aguardar resposta da API do Google Gemini (15s).
- 500 Internal Server Error: Erro interno ou falha no SQLite / processamento.
