import { z } from "zod";

export const updateReadingSchema = z.object({
  status: z.enum(["WANT_TO_READ", "READING", "READ"], { error: "Status de leitura inválido." }).optional(),
  currentPage: z.number({ error: "Informe uma página válida." }).int("Informe uma página inteira.").min(0, "A página não pode ser negativa.").max(2147483647, "Página inválida.").optional(),
}, { error: "Informe dados de leitura válidos." }).strict().refine((value) => value.status !== undefined || value.currentPage !== undefined, "Informe o status ou a página atual.");
