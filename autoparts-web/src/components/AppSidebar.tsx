import { FileText, MessageSquare, Package, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import type { ModuloAtivo } from "../types/autoparts";
import { Badge } from "./ui/badge";

interface AppSidebarProps {
  moduloAtivo: ModuloAtivo;
  onSelectModulo: (modulo: ModuloAtivo) => void;
  totalItensOrcamento: number;
}

const NAV_ITEMS: Array<{
  id: ModuloAtivo;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    id: "consulta",
    label: "Consulta",
    description: "Assistente de IA",
    icon: MessageSquare,
  },
  {
    id: "estoque",
    label: "Estoque",
    description: "Catálogo & Saldo ERP",
    icon: Package,
  },
  {
    id: "orcamentos",
    label: "Orçamentos",
    description: "Pedidos de Balcão",
    icon: FileText,
  },
];

export function AppSidebar({
  moduloAtivo,
  onSelectModulo,
  totalItensOrcamento,
}: AppSidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-zinc-200/80 bg-white md:w-60 md:border-b-0 md:border-r">
      {/* Identidade Minimalista */}
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-100 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-zinc-900">
            AutoParts AI
          </span>
          <span className="block text-[10px] text-zinc-400">ERP & Copilot</span>
        </div>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex flex-row gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col" aria-label="Menu principal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const ativo = moduloAtivo === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModulo(item.id)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors",
                ativo
                  ? "bg-zinc-900 font-medium text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn("h-4 w-4 shrink-0", ativo ? "text-zinc-100" : "text-zinc-400")} />
                <div>
                  <span className="block leading-none">{item.label}</span>
                  <span
                    className={cn(
                      "mt-1 hidden text-[11px] md:block",
                      ativo ? "text-zinc-300" : "text-zinc-400"
                    )}
                  >
                    {item.description}
                  </span>
                </div>
              </div>

              {item.id === "orcamentos" && totalItensOrcamento > 0 && (
                <Badge
                  variant={ativo ? "secondary" : "default"}
                  className="ml-auto h-5 px-1.5 text-[10px]"
                >
                  {totalItensOrcamento}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Rodapé discreto indicando sincronização ativa */}
      <div className="hidden border-t border-zinc-100 p-4 md:block">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>SQLite ERP sincronizado com IA</span>
        </div>
      </div>
    </aside>
  );
}
