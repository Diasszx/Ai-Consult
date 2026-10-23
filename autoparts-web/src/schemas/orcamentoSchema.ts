import { z } from "zod";

export const confirmarOrcamentoSchema = z.object({
  cliente_nome: z
    .string()
    .trim()
    .min(2, "Informe o nome do cliente (mín. 2 caracteres).")
    .max(120, "Máximo de 120 caracteres."),
  cliente_telefone: z
    .string()
    .trim()
    .max(30, "Máximo de 30 caracteres.")
    .refine((val) => {
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 11;
    }, "Informe um número com DDD válido: (XX) 9XXXX-XXXX ou (XX) XXXX-XXXX."),
  cliente_veiculo: z
    .string()
    .trim()
    .max(120, "Máximo de 120 caracteres.")
    .default(""),
  observacoes: z
    .string()
    .trim()
    .max(300, "Máximo de 300 caracteres.")
    .default(""),
});

export type ConfirmarOrcamentoFormValues = z.infer<typeof confirmarOrcamentoSchema>;

