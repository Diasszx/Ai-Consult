import { useState } from "react";
import { Check, CheckCircle2, Copy, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { formatCurrencyBRL } from "../lib/formatters";
import type { ItemOrcamento } from "../types/autoparts";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface QuoteSummaryPanelProps {
  itens: ItemOrcamento[];
  valorTotal: number;
  onAlterarQuantidade: (sku: string, delta: number) => void;
  onRemoverItem: (sku: string) => void;
  onLimpar: () => void;
  onGerarResumo: () => string;
  onConfirmarOrcamento: () => void;
}

export function QuoteSummaryPanel({
  itens,
  valorTotal,
  onAlterarQuantidade,
  onRemoverItem,
  onLimpar,
  onGerarResumo,
  onConfirmarOrcamento,
}: QuoteSummaryPanelProps) {
  const [copiado, setCopiado] = useState(false);

  if (itens.length === 0) {
    return null;
  }

  const handleCopyOrcamento = async () => {
    try {
      await navigator.clipboard.writeText(onGerarResumo());
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Ignora falha de permissão de clipboard
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <ShoppingBag className="h-4 w-4 text-zinc-600" />
          Orçamento Rápido
        </div>
        <button
          type="button"
          onClick={onLimpar}
          className="text-xs text-zinc-400 transition-colors hover:text-red-600"
        >
          Limpar
        </button>
      </div>

      <div className="space-y-3">
        {itens.map((item) => {
          const noLimite = item.quantidadeSelecionada >= item.estoqueMaximo;
          return (
            <div
              key={item.sku}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900">{item.nome_peca}</p>
                <p className="text-xs text-zinc-400">
                  {item.sku} · {formatCurrencyBRL(item.preco)} un.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onAlterarQuantidade(item.sku, -1)}
                  aria-label={`Diminuir quantidade de ${item.nome_peca}`}
                  className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-xs font-medium text-zinc-900">
                  {item.quantidadeSelecionada}
                </span>
                <button
                  type="button"
                  disabled={noLimite}
                  title={noLimite ? `Limite máximo em estoque (${item.estoqueMaximo})` : "Aumentar"}
                  onClick={() => onAlterarQuantidade(item.sku, 1)}
                  aria-label={`Aumentar quantidade de ${item.nome_peca}`}
                  className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoverItem(item.sku)}
                  aria-label={`Remover ${item.nome_peca}`}
                  className="ml-1 text-zinc-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-zinc-400">
            Total do Orçamento
          </span>
          <span className="text-base font-bold text-zinc-900">
            {formatCurrencyBRL(valorTotal)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCopyOrcamento()}
          >
            {copiado ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar Rascunho
              </>
            )}
          </Button>

          <Button type="button" size="sm" onClick={onConfirmarOrcamento}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirmar Orçamento
          </Button>
        </div>
      </div>
    </Card>
  );
}
