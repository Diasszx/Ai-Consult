import { useState } from "react";
import { Clock, RotateCcw } from "lucide-react";
import { AiConsultationFeed } from "./components/AiConsultationFeed";
import { AiSearchForm } from "./components/AiSearchForm";
import { AppSidebar } from "./components/AppSidebar";
import { BudgetsView } from "./components/BudgetsView";
import { ConfirmBudgetModal } from "./components/ConfirmBudgetModal";
import { InventoryView } from "./components/InventoryView";
import { QuoteSummaryPanel } from "./components/QuoteSummaryPanel";
import { useOrcamento } from "./hooks/useOrcamento";
import type { ConfirmarOrcamentoFormValues } from "./schemas/orcamentoSchema";
import {
  AutopartsApiException,
  consultarPecaComIA,
  criarOrcamento,
} from "./services/autopartsService";
import type { ApiError, InteracaoConsulta, ModuloAtivo } from "./types/autoparts";

export function App() {
  // Tela inicial padrão é sempre a conversa com a IA ("consulta")
  const [moduloAtivo, setModuloAtivo] = useState<ModuloAtivo>("consulta");

  const [historico, setHistorico] = useState<InteracaoConsulta[]>([]);
  const [idAtivo, setIdAtivo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [perguntaPendente, setPerguntaPendente] = useState<string | null>(null);
  const [ultimaPergunta, setUltimaPergunta] = useState<string>("");
  const [error, setError] = useState<ApiError | null>(null);

  // Estado do Modal de Confirmação de Orçamento por Cliente
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmittingOrcamento, setIsSubmittingOrcamento] = useState(false);
  const [confirmModalError, setConfirmModalError] = useState<string | null>(null);

  const {
    itens,
    totalUnidades,
    valorTotal,
    adicionarPeca,
    alterarQuantidade,
    removerItem,
    limparOrcamento,
    gerarResumoTexto,
  } = useOrcamento();

  const handleAbrirModalConfirmar = () => {
    setConfirmModalError(null);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmarOrcamentoCliente = async (
    values: ConfirmarOrcamentoFormValues
  ) => {
    if (itens.length === 0) return;
    setIsSubmittingOrcamento(true);
    setConfirmModalError(null);

    try {
      await criarOrcamento({
        cliente_nome: values.cliente_nome,
        cliente_telefone: values.cliente_telefone,
        cliente_veiculo: values.cliente_veiculo ?? "",
        observacoes: values.observacoes ?? "",
        itens: itens.map((item) => ({
          sku: item.sku,
          nome_peca: item.nome_peca,
          preco_unitario: item.preco,
          quantidade: item.quantidadeSelecionada,
        })),
      });

      limparOrcamento();
      setIsConfirmModalOpen(false);
      setModuloAtivo("orcamentos");
    } catch (err: unknown) {
      if (err instanceof AutopartsApiException) {
        setConfirmModalError(err.apiError.detail);
      } else {
        setConfirmModalError("Não foi possível salvar o orçamento do cliente.");
      }
    } finally {
      setIsSubmittingOrcamento(false);
    }
  };

  const interacaoAtiva =
    historico.find((item) => item.id === idAtivo) ?? historico[0] ?? null;

  const handleConsultar = async (pergunta: string) => {
    setIsLoading(true);
    setError(null);
    setPerguntaPendente(pergunta);
    setUltimaPergunta(pergunta);

    try {
      const resultado = await consultarPecaComIA({ pergunta });
      const novaInteracao: InteracaoConsulta = {
        id: crypto.randomUUID(),
        pergunta,
        resposta: resultado.resposta,
        pecas_encontradas: resultado.pecas_encontradas,
        criadoEm: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setHistorico((prev) => [novaInteracao, ...prev.slice(0, 7)]);
      setIdAtivo(novaInteracao.id);
    } catch (err: unknown) {
      if (err instanceof AutopartsApiException) {
        setError(err.apiError);
      } else {
        setError({
          status: 500,
          title: "Erro inesperado",
          detail: "Ocorreu uma falha ao processar a consulta com a IA.",
          canRetry: true,
        });
      }
    } finally {
      setIsLoading(false);
      setPerguntaPendente(null);
    }
  };

  const handleLimparConversa = () => {
    setHistorico([]);
    setIdAtivo(null);
    setError(null);
  };

  const isEmptyState = !interacaoAtiva && !isLoading && !error;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 md:flex-row">
      {/* Barra Lateral Minimalista: Consulta (Inicial) | Estoque | Orçamentos */}
      <AppSidebar
        moduloAtivo={moduloAtivo}
        onSelectModulo={setModuloAtivo}
        totalItensOrcamento={totalUnidades}
      />

      {/* Área Principal */}
      <main className="flex-1 px-4 py-8 md:px-8 md:py-10">
        {moduloAtivo === "consulta" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                  Consulta com IA
                </h1>
                <p className="text-sm text-zinc-500">
                  Pergunte em linguagem natural para consultar o catálogo e o saldo atualizado do ERP.
                </p>
              </div>

              {historico.length > 0 && (
                <button
                  type="button"
                  onClick={handleLimparConversa}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpar conversa
                </button>
              )}
            </div>

            <AiSearchForm
              isLoading={isLoading}
              showSuggestions={isEmptyState}
              onSubmitPergunta={handleConsultar}
            />

            {historico.length > 1 && !isLoading && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                {historico.map((item) => {
                  const selecionado = item.id === interacaoAtiva?.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setError(null);
                        setIdAtivo(item.id);
                      }}
                      className={`max-w-[200px] truncate rounded-full px-2.5 py-1 text-xs transition-colors ${
                        selecionado
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-200/60 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {item.pergunta}
                    </button>
                  );
                })}
              </div>
            )}

            <AiConsultationFeed
              interacaoAtiva={interacaoAtiva}
              isLoading={isLoading}
              perguntaPendente={perguntaPendente}
              error={error}
              onRetry={() => {
                if (ultimaPergunta) {
                  void handleConsultar(ultimaPergunta);
                }
              }}
              onAddOrcamento={adicionarPeca}
            />

            <QuoteSummaryPanel
              itens={itens}
              valorTotal={valorTotal}
              onAlterarQuantidade={alterarQuantidade}
              onRemoverItem={removerItem}
              onLimpar={limparOrcamento}
              onGerarResumo={gerarResumoTexto}
              onConfirmarOrcamento={handleAbrirModalConfirmar}
            />
          </div>
        )}

        {moduloAtivo === "estoque" && <InventoryView />}

        {moduloAtivo === "orcamentos" && (
          <BudgetsView
            rascunhoItens={itens}
            rascunhoValorTotal={valorTotal}
            onAlterarQuantidadeRascunho={alterarQuantidade}
            onRemoverItemRascunho={removerItem}
            onLimparRascunho={limparOrcamento}
            onGerarResumoRascunho={gerarResumoTexto}
            onAbrirModalConfirmarRascunho={handleAbrirModalConfirmar}
            onIrParaConsulta={() => setModuloAtivo("consulta")}
          />
        )}
      </main>

      <ConfirmBudgetModal
        isOpen={isConfirmModalOpen}
        itens={itens}
        valorTotal={valorTotal}
        isSubmitting={isSubmittingOrcamento}
        apiErrorMessage={confirmModalError}
        onClose={() => setIsConfirmModalOpen(false)}
        onSubmitCustomerData={handleConfirmarOrcamentoCliente}
      />
    </div>
  );
}
export default App;
