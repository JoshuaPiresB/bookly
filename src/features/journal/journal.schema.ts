import { z } from "zod";
import { externalIdSchema } from "@/features/books/book.schema";

export const journalIdSchema = z.uuid("Identificador inválido.");
const content = z.string("Informe o texto.").trim().min(1, "O texto é obrigatório.").max(20000, "O texto deve ter no máximo 20.000 caracteres.").refine((value) => !value.includes("\0"), "O texto contém caracteres inválidos.");
const title = z.string("Título inválido.").trim().max(120, "O título deve ter no máximo 120 caracteres.").refine((value) => !value.includes("\0"), "O título contém caracteres inválidos.").transform((value) => value || null).nullable();
const finishedAt = z.iso.date("Informe uma data de conclusão válida.").refine((value) => value.slice(0, 4) !== "0000", "Informe um ano válido.").transform((value) => new Date(`${value}T00:00:00.000Z`)).nullable();
const reviewFields = {
  rating: z.number("Escolha sua nota.").int("A nota deve ser inteira.").min(1, "Escolha uma nota entre 1 e 5.").max(5, "Escolha uma nota entre 1 e 5."),
  content, title: title.optional(), finishedAt: finishedAt.optional(),
  isPublic: z.boolean("Visibilidade inválida.").optional(),
};
export const createReviewSchema = z.object({ externalId: externalIdSchema, ...reviewFields }, { error: "Dados de resenha inválidos." }).strict();
export const updateReviewSchema = z.object(reviewFields, { error: "Dados de resenha inválidos." }).partial().strict().refine((value) => Object.keys(value).length > 0, "Informe os campos para atualizar.");
const noteFields = {
  content,
  page: z.number("Informe uma página válida.").int("A página deve ser inteira.").min(1, "A página deve ser maior que zero.").max(2147483647, "Página inválida.").nullable().optional(),
};
export const createNoteSchema = z.object(noteFields, { error: "Dados de anotação inválidos." }).strict();
export const updateNoteSchema = z.object(noteFields, { error: "Dados de anotação inválidos." }).partial().strict().refine((value) => Object.keys(value).length > 0, "Informe os campos para atualizar.");
