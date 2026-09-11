import { describe, it, expect } from "vitest";
import { createReviewSchema, updateReviewSchema, createNoteSchema, updateNoteSchema } from "@/features/journal/journal.schema";
const review = { externalId: "book-123", rating: 4, content: "Texto" };
describe("validação do diário", () => {
  it.each([0, 6, 2.5, "4", null])("recusa nota inválida: %s", (rating) => {
    expect(createReviewSchema.safeParse({ ...review, rating }).success).toBe(false);
  });
  it.each([1, 2, 3, 4, 5])("aceita nota inteira: %s", (rating) => {
    expect(createReviewSchema.parse({ ...review, rating }).rating).toBe(rating);
  });
  it("normaliza opcionais, visibilidade e data sem deslocamento de fuso", () => {
    const parsed = createReviewSchema.parse({ ...review, title: "  ", content: " Texto ", finishedAt: "2024-02-29", isPublic: false });
    expect(parsed.title).toBeNull(); expect(parsed.content).toBe("Texto");
    expect(parsed.finishedAt?.toISOString()).toBe("2024-02-29T00:00:00.000Z");
    for (const finishedAt of ["2025-02-29", "2026-04-31", "10/09/2026", "0000-01-01", "2026-09-10T00:00:00Z"]) expect(createReviewSchema.safeParse({ ...review, finishedAt }).success).toBe(false);
  });
  it("exige conteúdo não vazio e limita campos", () => {
    for (const content of ["", " \n\t ", "\0", "a".repeat(20001)]) {
      expect(createReviewSchema.safeParse({ ...review, content }).success).toBe(false);
      expect(createNoteSchema.safeParse({ content }).success).toBe(false);
    }
    expect(createReviewSchema.safeParse({ ...review, title: "a".repeat(121) }).success).toBe(false);
  });
  it("não aceita propriedade ou relação de livro injetada", () => {
    expect(createReviewSchema.safeParse({ ...review, userId: "alguém" }).success).toBe(false);
    expect(updateReviewSchema.safeParse({ externalId: "outro-livro" }).success).toBe(false);
    expect(updateNoteSchema.safeParse({ bookId: "outro-livro" }).success).toBe(false);
    expect(updateReviewSchema.safeParse({}).success).toBe(false);
    expect(updateNoteSchema.safeParse({}).success).toBe(false);
  });
  it("anotação pode não ter página, mas número informado deve ser positivo e inteiro", () => {
    expect(createNoteSchema.safeParse({ content: "Nota" }).success).toBe(true);
    expect(createNoteSchema.safeParse({ content: "Nota", page: null }).success).toBe(true);
    for (const page of [0, -1, 1.5, "3", 2147483648]) expect(createNoteSchema.safeParse({ content: "Nota", page }).success).toBe(false);
  });
});
