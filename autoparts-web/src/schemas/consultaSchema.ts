import { z } from "zod";

export const consultaSchema = z.object({
  pergunta: z
    .string()
    .trim()
    .min(3, "Digite pelo menos 3 caracteres para consultar a IA.")
    .max(500, "A pergunta deve ter no máximo 500 caracteres."),
});

export type ConsultaFormValues = z.infer<typeof consultaSchema>;
