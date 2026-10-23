import { FileText, Sparkles } from "lucide-react";
import type { ItemOrcamento } from "../types/autoparts";
import { QuoteSummaryPanel } from "./QuoteSummaryPanel";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface BudgetsPlaceholderViewProps {
  itens: ItemOrcamento[];
  valorTotal: number;
  onAlterarQuantidade: (sku: string, delta: number) => void;
  onRemoverItem: (sku: string) => void;
  onLimpar: () => void;
  onGerarResumo: () => string;
  onIrParaConsulta: () => void;
}

export function BudgetsPlaceholderView({
  itens,
  valorTotal,
  onAlterarQuantidade,
  onRemoverItem,
  onLimpar,
  onGerarResumo,
  onIrParaConsulta,
}: BudgetsPlaceholderViewProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Orçamentos
          </h1>
          <p className="text-sm text-zinc-500">
            Consolidação dos itens selecionados durante o atendimento.
          </p>
        </div>
        <Badge variant="secondary">Próxima Spec</Badge>
      </div>

      {itens.length > 0 ? (
        <QuoteSummaryPanel
          itens={itens}
          valorTotal={valorTotal}
          onAlterarQuantidade={onAlterarQuantidade}
          onRemoverItem={onRemoverItem}
          onLimpar={onLimpar}
          onGerarResumo={onGerarResumo}
          onConfirmarOrcamento={onIrParaConsulta}
        />
      ) : (
        <Card className="flex flex-col items-center justify-center space-y-3 p-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-900">
              Nenhum item no orçamento atual
            </h2>
            <p className="max-w-sm text-xs text-zinc-500">
              Consulte peças com a IA na tela inicial para adicionar itens ao orçamento rápido. O módulo completo de gestão de orçamentos será expandido na próxima especificação.
            </p>
          </div>
          <Button size="sm" onClick={onIrParaConsulta}>
            <Sparkles className="h-3.5 w-3.5" />
            Ir para Consulta com IA
          </Button>
        </Card>
      )}
    </div>
  );
}
