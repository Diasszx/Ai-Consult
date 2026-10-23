import type {
  ApiError,
  ConsultaRequest,
  ConsultaResponse,
  EstoqueCreateInput,
  EstoqueItem,
  EstoqueUpdateInput,
  OrcamentoCliente,
  OrcamentoCreatePayload,
  StatusOrcamento,
} from "../types/autoparts";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

const REQUEST_TIMEOUT_MS = 16000;

export class AutopartsApiException extends Error {
  public readonly apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.detail);
    this.name = "AutopartsApiException";
    this.apiError = apiError;
  }
}

function mapHttpError(status: number, rawDetail: string): ApiError {
  if (status === 409) {
    return {
      status,
      title: "Conflito de Operação no ERP",
      detail: rawDetail || "Conflito ao processar o registro no estoque ou orçamento.",
      canRetry: false,
    };
  }
  if (status === 404) {
    return {
      status,
      title: "Item não encontrado",
      detail: rawDetail || "A peça solicitada não foi localizada no banco de dados.",
      canRetry: false,
    };
  }
  if (status === 422) {
    return {
      status,
      title: "Dados inválidos",
      detail: rawDetail || "Verifique os campos preenchidos e tente novamente.",
      canRetry: false,
    };
  }
  if (status === 504) {
    return {
      status,
      title: "Tempo limite excedido (Timeout)",
      detail: rawDetail || "O provedor de IA demorou mais de 15 segundos para responder.",
      canRetry: true,
    };
  }
  if (status === 502) {
    return {
      status,
      title: "Instabilidade no Provedor de IA",
      detail: rawDetail || "Falha de comunicação com o motor de Inteligência Artificial.",
      canRetry: true,
    };
  }
  return {
    status,
    title: "Erro no Servidor / ERP",
    detail: rawDetail || "Não foi possível concluir a operação no momento.",
    canRetry: true,
  };
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "";
    try {
      const errorBody = (await response.json()) as { detail?: unknown };
      if (typeof errorBody.detail === "string") {
        detail = errorBody.detail;
      }
    } catch {
      detail = response.statusText;
    }
    throw new AutopartsApiException(mapHttpError(response.status, detail));
  }
  return (await response.json()) as T;
}

export async function consultarPecaComIA(payload: ConsultaRequest): Promise<ConsultaResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/consultar-peca`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return await handleJsonResponse<ConsultaResponse>(response);
  } catch (error: unknown) {
    if (error instanceof AutopartsApiException) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AutopartsApiException({
        status: 504,
        title: "Tempo limite excedido",
        detail: "A requisição excedeu o tempo máximo de espera de 16 segundos.",
        canRetry: true,
      });
    }
    throw new AutopartsApiException({
      status: 0,
      title: "Servidor API inacessível",
      detail:
        "Não foi possível conectar à API em " +
        API_BASE_URL +
        ". Verifique se o Uvicorn está rodando.",
      canRetry: true,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function listarEstoque(): Promise<EstoqueItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/estoque`);
    return await handleJsonResponse<EstoqueItem[]>(response);
  } catch (error: unknown) {
    if (error instanceof AutopartsApiException) throw error;
    throw new AutopartsApiException({
      status: 0,
      title: "Erro de conexão com o ERP",
      detail: "Não foi possível carregar os itens do estoque.",
      canRetry: true,
    });
  }
}

export async function criarItemEstoque(payload: EstoqueCreateInput): Promise<EstoqueItem> {
  try {
    const response = await fetch(`${API_BASE_URL}/estoque`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await handleJsonResponse<EstoqueItem>(response);
  } catch (error: unknown) {
    if (error instanceof AutopartsApiException) throw error;
    throw new AutopartsApiException({
      status: 0,
      title: "Falha ao adicionar item",
      detail: "Erro de rede ao tentar salvar no banco de dados.",
      canRetry: true,
    });
  }
}

export async function atualizarItemEstoque(
  sku: string,
  payload: EstoqueUpdateInput
): Promise<EstoqueItem> {
  try {
    const response = await fetch(`${API_BASE_URL}/estoque/${encodeURIComponent(sku)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await handleJsonResponse<EstoqueItem>(response);
  } catch (error: unknown) {
    if (error instanceof AutopartsApiException) throw error;
    throw new AutopartsApiException({
      status: 0,
      title: "Falha ao atualizar item",
      detail: "Erro de rede ao tentar atualizar o registro no banco.",
      canRetry: true,
    });
  }
}

export async function excluirItemEstoque(sku: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/estoque/${encodeURIComponent(sku)}`, {
      method: "DELETE",
    });
    await handleJsonResponse<{ status: string }>(response);
  } catch (error: unknown) {
    if (error instanceof AutopartsApiException) throw error;
    throw new AutopartsApiException({
      status: 0,
      title: "Falha ao excluir item",
      detail: "Erro de rede ao tentar remover o item do estoque.",
      canRetry: true,
    });
  }
}

export async function criarOrcamento(payload: OrcamentoCreatePayload): Promise<OrcamentoCliente> {
  try {
    const response = await fetch(`${API_BASE_URL}/orcamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await handleJsonResponse<OrcamentoCliente>(response);
  } catch (error: unknown) {
    if (error instanceof AutopartsApiException) throw error;
    throw new AutopartsApiException({
      status: 0,
      title: "Falha ao confirmar orçamento",
      detail: "Erro de rede ao tentar salvar o orçamento do cliente.",
      canRetry: true,
    });
  }
}

export async function listarOrcamentos(): Promise<OrcamentoCliente[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/orcamentos`);
    return await handleJsonResponse<OrcamentoCliente[]>(response);
  } catch (error: unknown) {
    if (error instanceof AutopartsApiException) throw error;
    throw new AutopartsApiException({
      status: 0,
      title: "Erro ao carregar orçamentos",
      detail: "Não foi possível buscar a lista de orçamentos no servidor.",
      canRetry: true,
    });
  }
}

export async function atualizarStatusOrcamento(
  orcamentoId: number,
  status: StatusOrcamento
): Promise<OrcamentoCliente> {
  try {
    const response = await fetch(`${API_BASE_URL}/orcamentos/${orcamentoId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return await handleJsonResponse<OrcamentoCliente>(response);
  } catch (error: unknown) {
    if (error instanceof AutopartsApiException) throw error;
    throw new AutopartsApiException({
      status: 0,
      title: "Falha ao atualizar status",
      detail: "Erro de rede ao tentar atualizar o status do orçamento.",
      canRetry: true,
    });
  }
}

export async function excluirOrcamento(orcamentoId: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/orcamentos/${orcamentoId}`, {
      method: "DELETE",
    });
    await handleJsonResponse<{ status: string }>(response);
  } catch (error: unknown) {
    if (error instanceof AutopartsApiException) throw error;
    throw new AutopartsApiException({
      status: 0,
      title: "Falha ao excluir orçamento",
      detail: "Erro de rede ao tentar remover o orçamento.",
      canRetry: true,
    });
  }
}

