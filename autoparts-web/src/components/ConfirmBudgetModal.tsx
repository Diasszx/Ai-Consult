import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Car, CheckCircle2, Loader2, Phone, User, X } from "lucide-react";
import { formatCurrencyBRL, formatPhoneNumberBR } from "../lib/formatters";
import {
  confirmarOrcamentoSchema,
  type ConfirmarOrcamentoFormValues,
} from "../schemas/orcamentoSchema";
import type { ItemOrcamento } from "../types/autoparts";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ConfirmBudgetModalProps {
  isOpen: boolean;
  itens: ItemOrcamento[];
  valorTotal: number;
  isSubmitting: boolean;
  apiErrorMessage: string | null;
  onClose: () => void;
  onSubmitCustomerData: (values: ConfirmarOrcamentoFormValues) => Promise<void>;
}

export function ConfirmBudgetModal({
  isOpen,
  itens,
  valorTotal,
  isSubmitting,
  apiErrorMessage,
  onClose,
  onSubmitCustomerData,
}: ConfirmBudgetModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ConfirmarOrcamentoFormValues>({
    resolver: zodResolver(confirmarOrcamentoSchema),
    defaultValues: {
      cliente_nome: "",
      cliente_telefone: "",
      cliente_veiculo: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        cliente_nome: "",
        cliente_telefone: "",
        cliente_veiculo: "",
        observacoes: "",
      });
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirmar-orcamento-titulo"
    >
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h2
              id="modal-confirmar-orcamento-titulo"
              className="text-base font-semibold text-zinc-900"
            >
              Confirmar Orçamento do Cliente
            </h2>
            <p className="text-xs text-zinc-500">
              Identifique o cliente para registrar o orçamento na aba Orçamentos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Resumo rápido dos itens selecionados */}
        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
            <span>{itens.length} peça(s) selecionada(s)</span>
            <span className="font-semibold text-zinc-900">
              Total: {formatCurrencyBRL(valorTotal)}
            </span>
          </div>
          <div className="mt-2 max-h-28 space-y-1 overflow-y-auto pr-1 text-xs text-zinc-500">
            {itens.map((item) => (
              <div key={item.sku} className="flex items-center justify-between">
                <span className="truncate">
                  {item.quantidadeSelecionada}x {item.nome_peca} ({item.sku})
                </span>
                <span className="ml-2 shrink-0 font-medium text-zinc-700">
                  {formatCurrencyBRL(item.preco * item.quantidadeSelecionada)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit((values) => void onSubmitCustomerData(values))}
          className="mt-4 space-y-4"
          noValidate
        >
          {apiErrorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {apiErrorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="cliente_nome"
              className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-700"
            >
              <User className="h-3.5 w-3.5 text-zinc-400" />
              Nome do Cliente *
            </label>
            <Input
              id="cliente_nome"
              placeholder="Ex: Carlos Mendes"
              aria-invalid={Boolean(errors.cliente_nome)}
              {...register("cliente_nome")}
            />
            {errors.cliente_nome && (
              <p className="mt-1 text-xs text-red-600">{errors.cliente_nome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="cliente_telefone"
                className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-700"
              >
                <Phone className="h-3.5 w-3.5 text-zinc-400" />
                Telefone / WhatsApp *
              </label>
              <Controller
                name="cliente_telefone"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="cliente_telefone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="(11) 98765-4321"
                    maxLength={15}
                    aria-invalid={Boolean(errors.cliente_telefone)}
                    onChange={(e) => {
                      const masked = formatPhoneNumberBR(e.target.value);
                      field.onChange(masked);
                    }}
                  />
                )}
              />
              {errors.cliente_telefone && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.cliente_telefone.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="cliente_veiculo"
                className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-700"
              >
                <Car className="h-3.5 w-3.5 text-zinc-400" />
                Veículo / Ano / Placa (opcional)
              </label>
              <Input
                id="cliente_veiculo"
                placeholder="Ex: Gol G5 2012 · ABC-1D23"
                aria-invalid={Boolean(errors.cliente_veiculo)}
                {...register("cliente_veiculo")}
              />
              {errors.cliente_veiculo && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.cliente_veiculo.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="observacoes"
              className="mb-1 block text-xs font-medium text-zinc-700"
            >
              Observações (opcional)
            </label>
            <Input
              id="observacoes"
              placeholder="Ex: Retirada no balcão às 16h / Pagamento no PIX"
              aria-invalid={Boolean(errors.observacoes)}
              {...register("observacoes")}
            />
            {errors.observacoes && (
              <p className="mt-1 text-xs text-red-600">{errors.observacoes.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar e Salvar Orçamento
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
