export type ModuloAtivo = "consulta" | "estoque" | "orcamentos";

export interface ConsultaRequest {
  pergunta: string;
}

export interface PecaERP {
  sku: string;
  nome_peca: string;
  marca: string;
  aplicacao: string;
  em_estoque: boolean;
  preco: number | null;
  quantidade: number | null;
}

export interface ConsultaResponse {
  status: string;
  pecas_encontradas: PecaERP[];
  resposta: string;
}

export interface InteracaoConsulta {
  id: string;
  pergunta: string;
  resposta: string;
  pecas_encontradas: PecaERP[];
  criadoEm: string;
}

export interface ItemOrcamento {
  sku: string;
  nome_peca: string;
  preco: number;
  quantidadeSelecionada: number;
  estoqueMaximo: number;
}

export interface EstoqueItem {
  sku: string;
  nome_peca: string;
  marca: string;
  aplicacao: string;
  preco: number | null;
  quantidade: number | null;
  em_estoque: boolean;
}

export interface EstoqueCreateInput {
  sku: string;
  nome_peca: string;
  marca: string;
  aplicacao: string;
  preco: number;
  quantidade: number;
}

export type EstoqueUpdateInput = Omit<EstoqueCreateInput, "sku">;

export type StatusOrcamento = "pendente" | "aprovado" | "cancelado";

export interface OrcamentoItemSalvo {
  sku: string;
  nome_peca: string;
  preco_unitario: number;
  quantidade: number;
  subtotal: number;
}

export interface OrcamentoCliente {
  id: number;
  codigo: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_veiculo: string;
  observacoes: string;
  status: StatusOrcamento;
  valor_total: number;
  criado_em: string;
  itens: OrcamentoItemSalvo[];
}

export interface OrcamentoCreatePayload {
  cliente_nome: string;
  cliente_telefone: string;
  cliente_veiculo: string;
  observacoes: string;
  itens: Array<{
    sku: string;
    nome_peca: string;
    preco_unitario: number;
    quantidade: number;
  }>;
}

export interface ApiError {
  status: number;
  title: string;
  detail: string;
  canRetry: boolean;
}
