import { AlertCircle, Bot, RefreshCw, User } from "lucide-react";
import type { ApiError, InteracaoConsulta, PecaERP } from "../types/autoparts";
import { PecaActionCard } from "./PecaActionCard";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

interface AiConsultationFeedProps {
  interacaoAtiva: InteracaoConsulta | null;
  isLoading: boolean;
  perguntaPendente: string | null;
  error: ApiError | null;
  onRetry: () => void;
  onAddOrcamento: (peca: PecaERP) => void;
}

export function AiConsultationFeed({
  interacaoAtiva,
  isLoading,
  perguntaPendente,
  error,
  onRetry,
  onAddOrcamento,
}: AiConsultationFeedProps) {
  if (isLoading) {
    return (
      <Card className="space-y-5 p-6" aria-busy="true" aria-live="polite">
        {perguntaPendente && (
          <div className="flex items-start gap-3 border-b border-zinc-100 pb-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
              <User className="h-3.5 w-3.5" />
            </div>
            <p className="pt-0.5 text-sm font-medium text-zinc-800">{perguntaPendente}</p>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
            <Bot className="h-3.5 w-3.5 animate-pulse" />
          </div>
          <div className="w-full space-y-3 pt-1">
            <p className="text-xs font-medium text-zinc-400">
              Consultando catálogo técnico e saldo em tempo real no ERP...
            </p>
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <div className="pt-2">
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="space-y-1">
            <p className="font-semibold">{error.title}</p>
            <p className="text-xs text-red-800/90">{error.detail}</p>
          </div>
        </div>

        {error.canRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        )}
      </Alert>
    );
  }

  if (!interacaoAtiva) {
    return null;
  }

  return (
    <Card className="space-y-5 p-6">
      {/* Pergunta feita pelo vendedor */}
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
            <User className="h-3.5 w-3.5" />
          </div>
          <p className="pt-0.5 text-sm font-medium text-zinc-900">
            {interacaoAtiva.pergunta}
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-zinc-400">
          {interacaoAtiva.criadoEm}
        </span>
      </div>

      {/* Resposta direta da IA (Protagonista) */}
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
          <Bot className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
            {interacaoAtiva.resposta}
          </div>

          {/* Mini-cards acionáveis das peças identificadas no ERP */}
          {interacaoAtiva.pecas_encontradas.length > 0 && (
            <div className="space-y-2.5 border-t border-zinc-100 pt-4">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Peças validadas no ERP ({interacaoAtiva.pecas_encontradas.length})
              </span>
              <div className="space-y-2">
                {interacaoAtiva.pecas_encontradas.map((peca) => (
                  <PecaActionCard
                    key={peca.sku}
                    peca={peca}
                    onAddOrcamento={onAddOrcamento}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
