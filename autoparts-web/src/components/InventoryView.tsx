import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { formatCurrencyBRL } from "../lib/formatters";
import type { EstoqueItemFormValues } from "../schemas/estoqueSchema";
import {
  AutopartsApiException,
  atualizarItemEstoque,
  criarItemEstoque,
  excluirItemEstoque,
  listarEstoque,
} from "../services/autopartsService";
import type { ApiError, EstoqueItem } from "../types/autoparts";
import { InventoryFormModal } from "./InventoryFormModal";
import { Alert } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function InventoryView() {
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [busca, setBusca] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState<EstoqueItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [skuExcluindo, setSkuExcluindo] = useState<string | null>(null);

  const carregarItens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lista = await listarEstoque();
      setItens(lista);
    } catch (err: unknown) {
      if (err instanceof AutopartsApiException) {
        setError(err.apiError);
      } else {
        setError({
          status: 500,
          title: "Erro ao carregar estoque",
          detail: "Não foi possível buscar a listagem de peças do ERP.",
          canRetry: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarItens();
  }, [carregarItens]);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter(
      (i) =>
        i.sku.toLowerCase().includes(termo) ||
        i.nome_peca.toLowerCase().includes(termo) ||
        i.marca.toLowerCase().includes(termo) ||
        i.aplicacao.toLowerCase().includes(termo)
    );
  }, [itens, busca]);

  const handleAbrirNovo = () => {
    setItemEditando(null);
    setModalError(null);
    setModalOpen(true);
  };

  const handleAbrirEdicao = (item: EstoqueItem) => {
    setItemEditando(item);
    setModalError(null);
    setModalOpen(true);
  };

  const handleSubmitForm = async (values: EstoqueItemFormValues, isEdit: boolean) => {
    setIsSubmitting(true);
    setModalError(null);
    try {
      if (isEdit && itemEditando) {
        const atualizado = await atualizarItemEstoque(itemEditando.sku, {
          nome_peca: values.nome_peca,
          marca: values.marca,
          aplicacao: values.aplicacao,
          preco: values.preco,
          quantidade: values.quantidade,
        });
        setItens((prev) =>
          prev.map((i) => (i.sku === atualizado.sku ? atualizado : i))
        );
      } else {
        const criado = await criarItemEstoque(values);
        setItens((prev) =>
          [...prev, criado].sort((a, b) => a.sku.localeCompare(b.sku))
        );
      }
      setModalOpen(false);
    } catch (err: unknown) {
      if (err instanceof AutopartsApiException) {
        setModalError(err.apiError.detail);
      } else {
        setModalError("Não foi possível salvar as alterações no banco de dados.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcluir = async (item: EstoqueItem) => {
    setSkuExcluindo(item.sku);
    try {
      await excluirItemEstoque(item.sku);
      setItens((prev) => prev.filter((i) => i.sku !== item.sku));
    } catch (err: unknown) {
      if (err instanceof AutopartsApiException) {
        setError(err.apiError);
      }
    } finally {
      setSkuExcluindo(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Cabeçalho do Módulo de Estoque */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Estoque & Catálogo ERP
          </h1>
          <p className="text-sm text-zinc-500">
            Gerencie peças, preços e saldos. Toda alteração reflete imediatamente nas respostas da IA.
          </p>
        </div>

        <Button onClick={handleAbrirNovo} className="shrink-0">
          <Plus className="h-4 w-4" />
          Adicionar Item
        </Button>
      </div>

      {/* Barra de Filtro Rápido */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por SKU, peça, marca ou veículo (ex: Gol G5, Cofap, AMOR)..."
            className="h-10 pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => void carregarItens()}
          title="Recarregar estoque"
          aria-label="Recarregar estoque"
          className="h-10 w-10 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">{error.title}</p>
              <p className="text-xs">{error.detail}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => void carregarItens()}>
            Tentar novamente
          </Button>
        </Alert>
      )}

      {/* Tabela ERP */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : itensFiltrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            Nenhum item encontrado no estoque para o filtro informado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Peça / Marca</TableHead>
                <TableHead>Aplicação Veicular</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensFiltrados.map((item) => {
                const semCadastroERP = item.preco === null || item.quantidade === null;
                return (
                  <TableRow key={item.sku}>
                    <TableCell className="font-mono text-xs font-semibold text-zinc-700">
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-zinc-900">{item.nome_peca}</p>
                      <p className="text-xs text-zinc-400">{item.marca}</p>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-zinc-600">
                      {item.aplicacao}
                    </TableCell>
                    <TableCell className="text-right font-medium text-zinc-900">
                      {formatCurrencyBRL(item.preco)}
                    </TableCell>
                    <TableCell>
                      {item.em_estoque ? (
                        <Badge variant="success">{item.quantidade} un.</Badge>
                      ) : semCadastroERP ? (
                        <Badge variant="secondary">Sem preço/saldo</Badge>
                      ) : (
                        <Badge variant="destructive">0 un. (Esgotado)</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar peça"
                          aria-label={`Editar ${item.sku}`}
                          onClick={() => handleAbrirEdicao(item)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir peça"
                          aria-label={`Excluir ${item.sku}`}
                          disabled={skuExcluindo === item.sku}
                          onClick={() => void handleExcluir(item)}
                          className="h-8 w-8 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        >
                          {skuExcluindo === item.sku ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <InventoryFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        itemParaEditar={itemEditando}
        isSubmitting={isSubmitting}
        apiErrorMessage={modalError}
        onSubmitForm={handleSubmitForm}
      />
    </div>
  );
}
