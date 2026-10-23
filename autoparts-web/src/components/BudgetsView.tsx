import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { formatCurrencyBRL } from "../lib/formatters";
import {
  AutopartsApiException,
  atualizarStatusOrcamento,
  excluirOrcamento,
  listarOrcamentos,
} from "../services/autopartsService";
import type {
  ItemOrcamento,
  OrcamentoCliente,
  StatusOrcamento,
} from "../types/autoparts";
import { QuoteSummaryPanel } from "./QuoteSummaryPanel";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

interface BudgetsViewProps {
  rascunhoItens: ItemOrcamento[];
  rascunhoValorTotal: number;
  onAlterarQuantidadeRascunho: (sku: string, delta: number) => void;
  onRemoverItemRascunho: (sku: string) => void;
  onLimparRascunho: () => void;
  onGerarResumoRascunho: () => string;
  onAbrirModalConfirmarRascunho: () => void;
  onIrParaConsulta: () => void;
}

function formatarPropostaWhatsApp(orcamento: OrcamentoCliente): string {
  const linhasItens = orcamento.itens.map(
    (item) =>
      `• ${item.quantidade}x ${item.nome_peca} (${item.sku}) — ${formatCurrencyBRL(
        item.preco_unitario
      )} un. = ${formatCurrencyBRL(item.subtotal)}`
  );

  const cabecalhoVeiculo = orcamento.cliente_veiculo
    ? `\n🚗 Veículo: ${orcamento.cliente_veiculo}`
    : "";
  const blocoObservacoes = orcamento.observacoes
    ? `\n📝 Obs.: ${orcamento.observacoes}`
    : "";

  return [
    `*ORÇAMENTO DE AUTOPEÇAS #${orcamento.codigo}*`,
    `👤 Cliente: ${orcamento.cliente_nome}`,
    `📞 Contato: ${orcamento.cliente_telefone}${cabecalhoVeiculo}`,
    `📅 Data: ${orcamento.criado_em}`,
    `----------------------------------`,
    ...linhasItens,
    `----------------------------------`,
    `*TOTAL: ${formatCurrencyBRL(orcamento.valor_total)}*${blocoObservacoes}`,
  ].join("\n");
}

export function BudgetsView({
  rascunhoItens,
  rascunhoValorTotal,
  onAlterarQuantidadeRascunho,
  onRemoverItemRascunho,
  onLimparRascunho,
  onGerarResumoRascunho,
  onAbrirModalConfirmarRascunho,
  onIrParaConsulta,
}: BudgetsViewProps) {
  const [orcamentos, setOrcamentos] = useState<OrcamentoCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusOrcamento>("todos");
  const [copiadoId, setCopiadoId] = useState<number | null>(null);
  const [acaoEmAndamentoId, setAcaoEmAndamentoId] = useState<number | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const carregarOrcamentos = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const dados = await listarOrcamentos();
      setOrcamentos(dados);
    } catch (err: unknown) {
      if (err instanceof AutopartsApiException) {
        setErrorMessage(err.apiError.detail);
      } else {
        setErrorMessage("Não foi possível carregar os orçamentos dos clientes.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarOrcamentos();
  }, [carregarOrcamentos]);

  const orcamentosFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    return orcamentos.filter((orc) => {
      const passaStatus =
        filtroStatus === "todos" ? true : orc.status === filtroStatus;
      if (!passaStatus) return false;
      if (!termo) return true;

      return (
        orc.cliente_nome.toLowerCase().includes(termo) ||
        orc.cliente_telefone.toLowerCase().includes(termo) ||
        orc.cliente_veiculo.toLowerCase().includes(termo) ||
        orc.codigo.toLowerCase().includes(termo)
      );
    });
  }, [orcamentos, buscaCliente, filtroStatus]);

  const metricas = useMemo(() => {
    const total = orcamentos.length;
    const pendentes = orcamentos.filter((o) => o.status === "pendente").length;
    const aprovados = orcamentos.filter((o) => o.status === "aprovado").length;
    const valorAprovado = orcamentos
      .filter((o) => o.status === "aprovado")
      .reduce((acc, o) => acc + o.valor_total, 0);
    return { total, pendentes, aprovados, valorAprovado };
  }, [orcamentos]);

  const handleCopiarProposta = async (orcamento: OrcamentoCliente) => {
    try {
      await navigator.clipboard.writeText(formatarPropostaWhatsApp(orcamento));
      setCopiadoId(orcamento.id);
      window.setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      // Ignora erro de permissão de clipboard
    }
  };

  const handleAlterarStatus = async (
    orcamento: OrcamentoCliente,
    novoStatus: StatusOrcamento
  ) => {
    setAcaoEmAndamentoId(orcamento.id);
    setFeedbackBanner(null);

    try {
      const atualizado = await atualizarStatusOrcamento(orcamento.id, novoStatus);
      setOrcamentos((prev) =>
        prev.map((item) => (item.id === atualizado.id ? atualizado : item))
      );
      if (novoStatus === "aprovado") {
        setFeedbackBanner({
          tipo: "sucesso",
          texto: `Orçamento #${atualizado.codigo} (${atualizado.cliente_nome}) aprovado! As peças foram baixadas automaticamente do Estoque ERP.`,
        });
      }
    } catch (err: unknown) {
      if (err instanceof AutopartsApiException) {
        setFeedbackBanner({
          tipo: "erro",
          texto: err.apiError.detail,
        });
      } else {
        setFeedbackBanner({
          tipo: "erro",
          texto: "Erro ao atualizar o status do orçamento.",
        });
      }
    } finally {
      setAcaoEmAndamentoId(null);
    }
  };

  const handleExcluir = async (orcamento: OrcamentoCliente) => {
    setAcaoEmAndamentoId(orcamento.id);
    setFeedbackBanner(null);

    try {
      await excluirOrcamento(orcamento.id);
      setOrcamentos((prev) => prev.filter((item) => item.id !== orcamento.id));
    } catch (err: unknown) {
      if (err instanceof AutopartsApiException) {
        setFeedbackBanner({
          tipo: "erro",
          texto: err.apiError.detail,
        });
      }
    } finally {
      setAcaoEmAndamentoId(null);
    }
  };

  const renderBadgeStatus = (status: StatusOrcamento) => {
    if (status === "aprovado") {
      return <Badge variant="success">Aprovado · Estoque Baixado</Badge>;
    }
    if (status === "cancelado") {
      return <Badge variant="destructive">Cancelado</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Orçamentos por Cliente
          </h1>
          <p className="text-sm text-zinc-500">
            Consulte propostas salvas por cliente, copie para o WhatsApp ou aprove para dar baixa automática no estoque.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={onIrParaConsulta}>
          <MessageSquare className="h-4 w-4" />
          Nova Consulta com IA
        </Button>
      </div>

      {/* Caso exista um rascunho ainda não confirmado na sessão atual */}
      {rascunhoItens.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Rascunho em andamento (ainda não vinculado a um cliente)
          </p>
          <QuoteSummaryPanel
            itens={rascunhoItens}
            valorTotal={rascunhoValorTotal}
            onAlterarQuantidade={onAlterarQuantidadeRascunho}
            onRemoverItem={onRemoverItemRascunho}
            onLimpar={onLimparRascunho}
            onGerarResumo={onGerarResumoRascunho}
            onConfirmarOrcamento={onAbrirModalConfirmarRascunho}
          />
        </div>
      )}

      {/* Indicadores rápidos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <span className="text-xs text-zinc-500">Total de Orçamentos</span>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{metricas.total}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-zinc-500">Aguardando Cliente (Pendentes)</span>
          <p className="mt-1 text-xl font-semibold text-amber-600">
            {metricas.pendentes}
          </p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-zinc-500">Fechados / Aprovados</span>
          <p className="mt-1 text-xl font-semibold text-emerald-700">
            {metricas.aprovados} ({formatCurrencyBRL(metricas.valorAprovado)})
          </p>
        </Card>
      </div>

      {/* Feedback de aprovação / erro de saldo */}
      {feedbackBanner && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs ${
            feedbackBanner.tipo === "sucesso"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.tipo === "sucesso" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <span>{feedbackBanner.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="ml-3 text-xs underline opacity-75 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Barra de busca por cliente e filtro de status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={buscaCliente}
            onChange={(e) => setBuscaCliente(e.target.value)}
            placeholder="Buscar por nome do cliente, telefone, veículo ou código (#ORC-0001)..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(["todos", "pendente", "aprovado", "cancelado"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltroStatus(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filtroStatus === st
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Orçamentos por Cliente */}
      {isLoading ? (
        <Card className="flex items-center justify-center gap-2 p-10 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando orçamentos de clientes...
        </Card>
      ) : errorMessage ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-zinc-700">{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={() => void carregarOrcamentos()}>
            Tentar novamente
          </Button>
        </Card>
      ) : orcamentosFiltrados.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-900">
              {orcamentos.length === 0
                ? "Nenhum orçamento confirmado ainda"
                : "Nenhum orçamento encontrado para este filtro"}
            </h2>
            <p className="max-w-md text-xs text-zinc-500">
              {orcamentos.length === 0
                ? "Na tela de Consulta com IA, adicione peças clicando em '+ Orçar' e depois clique em 'Confirmar Orçamento' para vincular os dados do cliente."
                : "Tente buscar por outro nome de cliente, telefone ou limpe o filtro selecionado."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {orcamentosFiltrados.map((orc) => {
            const processando = acaoEmAndamentoId === orc.id;
            const copiado = copiadoId === orc.id;

            return (
              <Card key={orc.id} className="p-5 transition-colors hover:border-zinc-300">
                {/* Cabeçalho do Cliente */}
                <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-800">
                        #{orc.codigo}
                      </span>
                      <h3 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900">
                        <User className="h-4 w-4 text-zinc-400" />
                        {orc.cliente_nome}
                      </h3>
                      {renderBadgeStatus(orc.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-zinc-400" />
                        {orc.cliente_telefone}
                      </span>
                      {orc.cliente_veiculo && (
                        <span className="inline-flex items-center gap-1">
                          <Car className="h-3.5 w-3.5 text-zinc-400" />
                          {orc.cliente_veiculo}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        {orc.criado_em}
                      </span>
                    </div>

                    {orc.observacoes && (
                      <p className="pt-1 text-xs italic text-zinc-500">
                        Obs.: {orc.observacoes}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="block text-[11px] uppercase tracking-wider text-zinc-400">
                      Total do Cliente
                    </span>
                    <span className="text-lg font-bold text-zinc-900">
                      {formatCurrencyBRL(orc.valor_total)}
                    </span>
                  </div>
                </div>

                {/* Tabela enxuta de itens do orçamento */}
                <div className="mt-3 space-y-2">
                  {orc.itens.map((item) => (
                    <div
                      key={`${orc.id}-${item.sku}`}
                      className="flex items-center justify-between rounded-lg bg-zinc-50/80 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-zinc-900">
                          {item.quantidade}x {item.nome_peca}
                        </span>
                        <span className="ml-2 font-mono text-[11px] text-zinc-500">
                          {item.sku}
                        </span>
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <span className="text-zinc-500">
                          {formatCurrencyBRL(item.preco_unitario)} un.
                        </span>
                        <span className="ml-3 font-semibold text-zinc-900">
                          {formatCurrencyBRL(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Barra de Ações do Orçamento */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopiarProposta(orc)}
                  >
                    {copiado ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Proposta Copiada!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar p/ WhatsApp
                      </>
                    )}
                  </Button>

                  <div className="flex flex-wrap items-center gap-2">
                    {orc.status === "pendente" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={processando}
                          onClick={() => void handleAlterarStatus(orc, "aprovado")}
                        >
                          {processando ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Aprovar e Baixar Estoque
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={processando}
                          onClick={() => void handleAlterarStatus(orc, "cancelado")}
                        >
                          <XCircle className="h-3.5 w-3.5 text-zinc-500" />
                          Cancelar
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={processando}
                      onClick={() => void handleExcluir(orc)}
                      aria-label={`Excluir orçamento ${orc.codigo}`}
                      className="text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
