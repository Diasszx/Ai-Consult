import { z } from "zod";

export const estoqueItemSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, "O código SKU deve ter pelo menos 2 caracteres.")
    .max(40, "O código SKU deve ter no máximo 40 caracteres.")
    .transform((val) => val.toUpperCase()),
  nome_peca: z
    .string()
    .trim()
    .min(3, "Informe o nome da peça (mín. 3 caracteres).")
    .max(150, "Máximo de 150 caracteres."),
  marca: z
    .string()
    .trim()
    .min(2, "Informe a marca do fabricante.")
    .max(80, "Máximo de 80 caracteres."),
  aplicacao: z
    .string()
    .trim()
    .min(3, "Informe os veículos e anos compatíveis.")
    .max(250, "Máximo de 250 caracteres."),
  preco: z.coerce
    .number({ invalid_type_error: "Informe um preço válido." })
    .min(0, "O preço não pode ser negativo."),
  quantidade: z.coerce
    .number({ invalid_type_error: "Informe uma quantidade inteira." })
    .int("A quantidade deve ser um número inteiro.")
    .min(0, "A quantidade não pode ser negativa."),
});

export type EstoqueItemFormValues = z.infer<typeof estoqueItemSchema>;
