import { z } from "zod";
import { externalIdSchema, paginationSchema } from "@/features/books/book.schema";

export const shelfIdSchema = z.uuid("Estante inválida.");
export const bookIdSchema = z.uuid("Identificador interno de livro inválido.");
const nameSchema = z.string("Informe o nome da estante.")
  .transform((name) => name.normalize("NFC").trim().replace(/\s+/gu, " "))
  .pipe(z.string().min(1, "Informe o nome da estante.").max(80, "O nome deve ter no máximo 80 caracteres."))
  .refine((name) => !/[\u0000-\u001f\u007f]/u.test(name), "O nome contém caracteres inválidos.");
const descriptionSchema = z.string("Descrição inválida.").trim().max(500, "A descrição deve ter no máximo 500 caracteres.")
  .refine((value) => !value.includes("\u0000"), "A descrição contém caracteres inválidos.")
  .transform((value) => value || null).nullable();
const shape = { name: nameSchema, description: descriptionSchema.optional() };
export const createShelfSchema = z.object(shape, { error: "Dados de estante inválidos ou não permitidos." }).strict();
export const updateShelfSchema = z.object({ name: nameSchema.optional(), description: descriptionSchema.optional() }, { error: "Dados de estante inválidos ou não permitidos." }).strict()
  .refine((input) => input.name !== undefined || input.description !== undefined, "Informe o nome ou a descrição para alterar.");
export const addShelfBookSchema = z.object({ externalId: externalIdSchema }, { error: "Dados de livro inválidos ou não permitidos." }).strict();
export const listShelvesSchema = paginationSchema.strict();
export const listShelfBooksSchema = paginationSchema.extend({ sort: z.enum(["recent", "title", "author"], { error: "Ordenação inválida." }).default("recent") }).strict();
