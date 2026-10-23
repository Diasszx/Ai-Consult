import { useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { formatCurrencyBRL } from "../lib/formatters";
import type { PecaERP } from "../types/autoparts";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface PecaActionCardProps {
  peca: PecaERP;
  onAddOrcamento: (peca: PecaERP) => void;
}

export function PecaActionCard({ peca, onAddOrcamento }: PecaActionCardProps) {
  const [copied, setCopied] = useState(false);

  const semCadastroERP = peca.preco === null || peca.quantidade === null;
  const disponivel = peca.em_estoque && !semCadastroERP;

  const handleCopySku = async () => {
    try {
      await navigator.clipboard.writeText(peca.sku);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignora erro de permissão de clipboard
    }
  };

  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center">
      <div className="space-y-1">
        {/* Linha 1: SKU + Marca ao lado + Status de Estoque */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopySku}
            title="Copiar código SKU"
            className="inline-flex items-center gap-1 rounded bg-zinc-200/70 px-2 py-0.5 font-mono text-xs font-medium text-zinc-700 hover:bg-zinc-200"
          >
            {peca.sku}
            {copied ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3 text-zinc-500" />
            )}
          </button>

          {peca.marca && (
            <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-600">
              {peca.marca}
            </span>
          )}

          {disponivel ? (
            <Badge variant="success">Em estoque · {peca.quantidade} un.</Badge>
          ) : semCadastroERP ? (
            <Badge variant="secondary">Sem cadastro no ERP</Badge>
          ) : (
            <Badge variant="destructive">Sem estoque (0 un.)</Badge>
          )}
        </div>

        {/* Linha 2: Nome da Peça */}
        <p className="pt-0.5 text-sm font-semibold text-zinc-900">{peca.nome_peca}</p>

        {/* Linha 3: Aplicação embaixo do nome */}
        {peca.aplicacao && (
          <p className="text-xs text-zinc-500">{peca.aplicacao}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="text-left sm:text-right">
          <span className="block text-[11px] uppercase tracking-wider text-zinc-400">
            Unitário
          </span>
          <span className="text-sm font-semibold text-zinc-900">
            {formatCurrencyBRL(peca.preco)}
          </span>
        </div>

        <Button
          size="sm"
          variant={disponivel ? "default" : "secondary"}
          disabled={!disponivel}
          onClick={() => onAddOrcamento(peca)}
          aria-label={`Adicionar ${peca.nome_peca} ao orçamento`}
        >
          <Plus className="h-3.5 w-3.5" />
          Orçar
        </Button>
      </div>
    </div>
  );
}
