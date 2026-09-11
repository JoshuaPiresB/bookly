import { z } from "zod";

export const externalIdSchema = z.string("Informe o identificador do livro.").trim()
  .regex(/^[A-Za-z0-9_-]{1,128}$/, "Identificador de livro inválido.");

export const paginationSchema = z.object({
  limit: z.coerce.number("Limite inválido.").int("O limite deve ser inteiro.").min(1, "O limite mínimo é 1.").max(40, "O limite máximo é 40.").default(20),
  offset: z.coerce.number("Posição inválida.").int("A posição deve ser inteira.").min(0, "A posição não pode ser negativa.").max(10000, "A posição máxima é 10000.").default(0),
});

export const bookSearchSchema = paginationSchema.extend({
  q: z.string("Informe sua busca.").trim().min(2, "Digite pelo menos 2 caracteres.").max(200, "A busca deve ter no máximo 200 caracteres.")
    .refine((q) => !/[\u0000-\u001f\u007f]/u.test(q), "A busca contém caracteres inválidos."),
  mode: z.enum(["all", "title", "author", "isbn"], { error: "Tipo de busca inválido." }).default("all"),
}).strict();

export type BookSearchInput = z.infer<typeof bookSearchSchema>;
