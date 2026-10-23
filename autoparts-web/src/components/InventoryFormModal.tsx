import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  estoqueItemSchema,
  type EstoqueItemFormValues,
} from "../schemas/estoqueSchema";
import type { EstoqueItem } from "../types/autoparts";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";

interface InventoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemParaEditar: EstoqueItem | null;
  isSubmitting: boolean;
  apiErrorMessage: string | null;
  onSubmitForm: (values: EstoqueItemFormValues, isEdit: boolean) => Promise<void>;
}

export function InventoryFormModal({
  open,
  onOpenChange,
  itemParaEditar,
  isSubmitting,
  apiErrorMessage,
  onSubmitForm,
}: InventoryFormModalProps) {
  const isEdit = Boolean(itemParaEditar);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EstoqueItemFormValues>({
    resolver: zodResolver(estoqueItemSchema),
    defaultValues: {
      sku: "",
      nome_peca: "",
      marca: "",
      aplicacao: "",
      preco: 0,
      quantidade: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (itemParaEditar) {
        reset({
          sku: itemParaEditar.sku,
          nome_peca: itemParaEditar.nome_peca,
          marca: itemParaEditar.marca,
          aplicacao: itemParaEditar.aplicacao,
          preco: itemParaEditar.preco ?? 0,
          quantidade: itemParaEditar.quantidade ?? 0,
        });
      } else {
        reset({
          sku: "",
          nome_peca: "",
          marca: "",
          aplicacao: "",
          preco: 0,
          quantidade: 1,
        });
      }
    }
  }, [open, itemParaEditar, reset]);

  const handleValidSubmit = async (values: EstoqueItemFormValues) => {
    await onSubmitForm(values, isEdit);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Editar Peça (${itemParaEditar?.sku})` : "Novo Item no Estoque"}
      description="Os dados salvos atualizam o banco SQLite e ficam imediatamente disponíveis para consulta na IA."
    >
      <form onSubmit={handleSubmit(handleValidSubmit)} className="space-y-4" noValidate>
        {apiErrorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {apiErrorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="sku" className="text-xs font-medium text-zinc-700">
              Código SKU
            </label>
            <Input
              id="sku"
              {...register("sku")}
              disabled={isEdit || isSubmitting}
              placeholder="Ex: BATE-ONIX-20"
              className="font-mono uppercase"
            />
            {errors.sku && (
              <p className="text-[11px] text-red-600">{errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="marca" className="text-xs font-medium text-zinc-700">
              Marca / Fabricante
            </label>
            <Input
              id="marca"
              {...register("marca")}
              disabled={isSubmitting}
              placeholder="Ex: Cofap, NGK, Moura"
            />
            {errors.marca && (
              <p className="text-[11px] text-red-600">{errors.marca.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="nome_peca" className="text-xs font-medium text-zinc-700">
            Nome Comercial da Peça
          </label>
          <Input
            id="nome_peca"
            {...register("nome_peca")}
            disabled={isSubmitting}
            placeholder="Ex: Bateria 60Ah Selada"
          />
          {errors.nome_peca && (
            <p className="text-[11px] text-red-600">{errors.nome_peca.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="aplicacao" className="text-xs font-medium text-zinc-700">
            Aplicação (Veículos, Anos e Motores Compatíveis)
          </label>
          <Input
            id="aplicacao"
            {...register("aplicacao")}
            disabled={isSubmitting}
            placeholder="Ex: Chevrolet Onix 2020 a 2024 (1.0 / 1.0 Turbo)"
          />
          {errors.aplicacao && (
            <p className="text-[11px] text-red-600">{errors.aplicacao.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="preco" className="text-xs font-medium text-zinc-700">
              Preço Unitário (R$)
            </label>
            <Input
              id="preco"
              type="number"
              step="0.01"
              min="0"
              {...register("preco")}
              disabled={isSubmitting}
            />
            {errors.preco && (
              <p className="text-[11px] text-red-600">{errors.preco.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="quantidade" className="text-xs font-medium text-zinc-700">
              Quantidade em Estoque
            </label>
            <Input
              id="quantidade"
              type="number"
              step="1"
              min="0"
              {...register("quantidade")}
              disabled={isSubmitting}
            />
            {errors.quantidade && (
              <p className="text-[11px] text-red-600">{errors.quantidade.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar Alterações" : "Adicionar ao Estoque"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
