import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, afterEach, describe, it, expect, vi } from "vitest";
import { getDb } from "@/lib/db";
import { requireApiUser, requireUser } from "@/lib/current-user";
import { registerUser } from "@/features/auth/auth.service";
import { createReview, updateReview, deleteReview, listReviews } from "@/features/reviews/review.service";
import { createNote, updateNote, deleteNote, listNotes } from "@/features/notes/note.service";
import { getDashboardData } from "@/features/dashboard/dashboard.service";
import { POST as reviewPost } from "@/app/api/reviews/route";
import { PATCH as reviewPatch } from "@/app/api/reviews/[id]/route";
import { POST as notePost } from "@/app/api/books/[externalId]/notes/route";

vi.mock("@/lib/current-user", () => ({ requireApiUser: vi.fn(), requireUser: vi.fn() }));
const db = getDb(), prefix = `journal-${randomUUID()}-`, users: string[] = [];
type User = Awaited<ReturnType<typeof requireApiUser>>;
let owner: User, visitor: User;
const content = { rating: 4, content: "Uma leitura interessante.", finishedAt: "2026-09-01" };
async function book(pageCount: number | null = 100) { return db.book.create({ data: { externalId: `${prefix}${randomUUID()}`, title: "Livro do diário", pageCount } }); }
function request(method: string, input: unknown, originOverride?: string) {
  const origin = new URL(process.env.NEXTAUTH_URL!).origin;
  return new Request(`${origin}/api/reviews`, { method, headers: { Origin: originOverride ?? origin, "Content-Type": "application/json" }, body: JSON.stringify(input) });
}
beforeAll(async () => {
  const password = "Diário seguro 2026!";
  owner = await registerUser({ name: "Dona do diário", email: `${prefix}owner@test.bookly.local`, password, confirmPassword: password }); users.push(owner.id);
  visitor = await registerUser({ name: "Visitante do diário", email: `${prefix}visitor@test.bookly.local`, password, confirmPassword: password }); users.push(visitor.id);
});
beforeEach(() => { vi.mocked(requireApiUser).mockResolvedValue(owner); vi.mocked(requireUser).mockResolvedValue(owner); });
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => { await db.user.deleteMany({ where: { id: { in: users } } }); await db.book.deleteMany({ where: { externalId: { startsWith: prefix } } }); await db.$disconnect(); });

describe("resenhas e anotações com PostgreSQL", () => {
  it("cria, edita e exclui resenha, preservando livro e histórico", async () => {
    const b = await book();
    const review = await createReview({ ...content, externalId: b.externalId, title: "Primeira impressão", isPublic: false });
    expect(review).toMatchObject({ title: "Primeira impressão", rating: 4, isPublic: false });
    const updated = await updateReview(review.id, { title: "", content: "Nova opinião", rating: 5, finishedAt: null, isPublic: true });
    expect(updated).toMatchObject({ id: review.id, title: null, rating: 5, content: "Nova opinião", finishedAt: null, isPublic: true });
    expect((await listReviews()).some((item) => item.id === review.id)).toBe(true);
    await deleteReview(review.id); expect(await db.review.count({ where: { id: review.id } })).toBe(0);
    expect(await db.book.count({ where: { id: b.id } })).toBe(1);
  });
  it("não duplica nem sobrescreve resenha existente sob concorrência", async () => {
    const b = await book(); const results = await Promise.allSettled(Array.from({ length: 4 }, () => createReview({ ...content, externalId: b.externalId })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected").every((result) => result.status === "rejected" && result.reason.code === "REVIEW_EXISTS")).toBe(true);
    expect(await db.review.count({ where: { bookId: b.id, userId: owner.id } })).toBe(1);
  });
  it("cria, edita, limpa página e exclui anotação", async () => {
    const b = await book(); const note = await createNote(b.externalId, { content: "Anotação inicial", page: 100 });
    expect(await updateNote(note.id, { content: "Anotação revista", page: 1 })).toMatchObject({ page: 1, content: "Anotação revista" });
    expect(await updateNote(note.id, { page: null })).toMatchObject({ page: null });
    expect(await listNotes(b.externalId)).toHaveLength(1);
    await deleteNote(note.id); expect(await listNotes(b.externalId)).toHaveLength(0);
  });
  it("recusa páginas inválidas e mantém conteúdo anterior na falha", async () => {
    const b = await book(); const note = await createNote(b.externalId, { content: "Original", page: 2 });
    for (const page of [0, -1, 1.5, 101]) {
      await expect(createNote(b.externalId, { content: "Nota", page })).rejects.toThrow();
      await expect(updateNote(note.id, { content: "Não salvar", page })).rejects.toThrow();
    }
    expect((await listNotes(b.externalId))[0]).toMatchObject({ content: "Original", page: 2 });
    const unknown = await book(null); expect((await createNote(unknown.externalId, { content: "Sem total", page: 999 })).page).toBe(999);
  });
  it("não permite ler, editar ou excluir registros alheios, mesmo públicos", async () => {
    const b = await book(); const review = await createReview({ ...content, externalId: b.externalId, isPublic: true }); const note = await createNote(b.externalId, { content: "Privado" });
    vi.mocked(requireApiUser).mockResolvedValue(visitor);
    expect(await listReviews()).toHaveLength(0); expect(await listNotes(b.externalId)).toHaveLength(0);
    for (const action of [() => updateReview(review.id, { rating: 1 }), () => deleteReview(review.id), () => updateNote(note.id, { content: "Invadida" }), () => deleteNote(note.id)]) await expect(action()).rejects.toMatchObject({ status: 404 });
    await createReview({ ...content, externalId: b.externalId }); // O catálogo é global; a relação de cada usuário é independente.
    expect(await db.review.count({ where: { bookId: b.id } })).toBe(2);
    expect(await db.readingNote.findUnique({ where: { id: note.id } })).toMatchObject({ content: "Privado", userId: owner.id });
  });
  it("persiste metadados reais normalizados na primeira anotação e desfaz criação inválida", async () => {
    const id = `${prefix}${randomUUID()}`;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id, volumeInfo: { title: "Livro externo", pageCount: 10 } })));
    await expect(createNote(id, { page: 11, content: "Fora do livro" })).rejects.toMatchObject({ code: "INVALID_NOTE_PAGE" });
    expect(await db.book.count({ where: { externalId: id } })).toBe(0);
    await createNote(id, { page: 10, content: "Persistido" }); expect(await db.book.count({ where: { externalId: id } })).toBe(1);
  });
  it("Home retorna no máximo duas resenhas mais recentes do usuário", async () => {
    for (let index = 0; index < 3; index++) { const b = await book(); await createReview({ ...content, externalId: b.externalId, title: `Recente ${index}` }); }
    const dashboard = await getDashboardData(); expect(dashboard.reviews).toHaveLength(2); expect(dashboard.reviews[0]?.title).toBe("Recente 2");
  });
  it("handlers validam rating, relação imutável, quota de corpo e origem", async () => {
    const b = await book();
    expect((await reviewPost(request("POST", { ...content, externalId: b.externalId, rating: 2.5 }))).status).toBe(400);
    expect((await reviewPost(request("POST", { ...content, externalId: b.externalId, userId: visitor.id }))).status).toBe(400);
    expect((await reviewPost(request("POST", { ...content, externalId: b.externalId }, "https://example.invalid"))).status).toBe(403);
    const response = await reviewPost(request("POST", { ...content, externalId: b.externalId, content: "á".repeat(20000) })); expect(response.status).toBe(201);
    const review = (await response.json()).data;
    expect((await reviewPost(request("POST", { ...content, externalId: b.externalId }))).status).toBe(409);
    expect((await reviewPatch(request("PATCH", { bookId: randomUUID(), rating: 3 }), { params: Promise.resolve({ id: review.id }) })).status).toBe(400);
    expect((await notePost(request("POST", { content: "Nota", page: 101 }), { params: Promise.resolve({ externalId: b.externalId }) })).status).toBe(400);
    expect((await reviewPost(request("POST", { ...content, externalId: b.externalId, content: "a".repeat(140000) }))).status).toBe(413);
  });
});
