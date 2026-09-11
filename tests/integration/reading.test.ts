import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import { getDb } from "@/lib/db";
import { requireApiUser, requireUser } from "@/lib/current-user";
import { registerUser } from "@/features/auth/auth.service";
import { updateReading, getReading } from "@/features/reading/reading.service";
import { getBookLibrary } from "@/features/books/book-library.service";
import { PATCH } from "@/app/api/books/[externalId]/reading/route";

vi.mock("@/lib/current-user", () => ({ requireApiUser: vi.fn(), requireUser: vi.fn() }));
const db = getDb(); const prefix = `reading-${randomUUID()}-`;
type User = Awaited<ReturnType<typeof requireApiUser>>;
let owner: User, visitor: User;
const users: string[] = [];
async function book(pageCount: number | null = 200) { return db.book.create({ data: { externalId: `${prefix}${randomUUID()}`, title: "Livro de leitura", pageCount } }); }
beforeAll(async () => {
  const password = "Leitura segura 2026!";
  owner = await registerUser({ name: "Dona da leitura", email: `${prefix}owner@test.bookly.local`, password, confirmPassword: password }); users.push(owner.id);
  visitor = await registerUser({ name: "Outra pessoa", email: `${prefix}visitor@test.bookly.local`, password, confirmPassword: password }); users.push(visitor.id);
});
beforeEach(() => { vi.mocked(requireApiUser).mockResolvedValue(owner); vi.mocked(requireUser).mockResolvedValue(owner); });
afterAll(async () => { await db.user.deleteMany({ where: { id: { in: users } } }); await db.book.deleteMany({ where: { externalId: { startsWith: prefix } } }); await db.$disconnect(); });

describe("estado de leitura real e sincronização", () => {
  it("quero ler → lendo → progresso → lido, com datas e estantes consistentes", async () => {
    const b = await book();
    const want = await updateReading(b.externalId, { status: "WANT_TO_READ" });
    expect(want).toMatchObject({ status: "WANT_TO_READ", currentPage: 0, startedAt: null, finishedAt: null });
    expect(await db.shelfBook.count({ where: { bookId: b.id, shelf: { userId: owner.id, systemKey: "WANT_TO_READ" } } })).toBe(1);
    const started = await updateReading(b.externalId, { status: "READING" }); expect(started.startedAt).toBeInstanceOf(Date);
    expect(await db.shelfBook.count({ where: { bookId: b.id, shelf: { userId: owner.id, systemKey: "WANT_TO_READ" } } })).toBe(0);
    const progress = await updateReading(b.externalId, { currentPage: 100 }); expect(progress).toMatchObject({ currentPage: 100, startedAt: started.startedAt, status: "READING" });
    const read = await updateReading(b.externalId, { status: "READ" }); expect(read).toMatchObject({ status: "READ", currentPage: 200 }); expect(read.finishedAt).toBeInstanceOf(Date);
    expect((await updateReading(b.externalId, { status: "READ" })).finishedAt).toEqual(read.finishedAt);
    expect(await db.shelfBook.count({ where: { bookId: b.id, shelf: { userId: owner.id, systemKey: "READ" } } })).toBe(1);
    const restart = await updateReading(b.externalId, { status: "READING" }); expect(restart).toMatchObject({ currentPage: 0, finishedAt: null });
    expect(await db.shelfBook.count({ where: { bookId: b.id, shelf: { userId: owner.id, systemKey: "READ" } } })).toBe(0);
  });
  it("rejeita página negativa, fracionária, excessiva, payload vazio e ownership injetado", async () => {
    const b = await book();
    for (const input of [{ currentPage: -1 }, { currentPage: 0.5 }, { currentPage: 201 }, {}, { currentPage: 1, userId: visitor.id }]) await expect(updateReading(b.externalId, input)).rejects.toThrow();
    expect(await getReading(b.externalId)).toBeNull();
  });
  it("aceita livro sem total, mas não conclui automaticamente em 100%", async () => {
    const unknown = await book(null); expect((await updateReading(unknown.externalId, { currentPage: 500 })).currentPage).toBe(500);
    const known = await book(); expect((await updateReading(known.externalId, { currentPage: 200 })).status).toBe("READING");
    await updateReading(known.externalId, { status: "READ" });
    await expect(updateReading(known.externalId, { currentPage: 10 })).rejects.toMatchObject({ code: "INVALID_PAGE" });
  });
  it("isola leituras, resenhas e anotações pelo usuário da sessão", async () => {
    const b = await book(); await updateReading(b.externalId, { currentPage: 40 });
    await db.review.create({ data: { userId: owner.id, bookId: b.id, rating: 4, content: "Resenha privada" } });
    await db.readingNote.create({ data: { userId: owner.id, bookId: b.id, page: 10, content: "Nota privada" } });
    expect((await getBookLibrary(b.externalId)).notes).toHaveLength(1);
    vi.mocked(requireApiUser).mockResolvedValue(visitor); vi.mocked(requireUser).mockResolvedValue(visitor);
    expect(await getReading(b.externalId)).toBeNull();
    expect(await getBookLibrary(b.externalId)).toMatchObject({ reading: null, review: null, notes: [] });
    await updateReading(b.externalId, { currentPage: 5 });
    expect(await db.readingState.findUnique({ where: { userId_bookId: { userId: owner.id, bookId: b.id } } })).toMatchObject({ currentPage: 40 });
  });
  it("serializa atualizações concorrentes sem duplicar estado nem vínculo", async () => {
    const b = await book(); await Promise.all(Array.from({ length: 4 }, () => updateReading(b.externalId, { status: "READ" })));
    expect(await db.readingState.count({ where: { userId: owner.id, bookId: b.id } })).toBe(1);
    expect(await db.shelfBook.count({ where: { bookId: b.id, shelf: { userId: owner.id, systemKey: "READ" } } })).toBe(1);
  });
  it("handler recusa CSRF e responde em português para dados inválidos", async () => {
    const b = await book(); const origin = new URL(process.env.NEXTAUTH_URL!).origin;
    const context = { params: Promise.resolve({ externalId: b.externalId }) };
    const response = await PATCH(new Request(`${origin}/api/books/${b.externalId}/reading`, { method: "PATCH", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ currentPage: 201 }) }), context);
    expect(response.status).toBe(400); expect((await response.json()).error.message).toContain("total de páginas");
    const csrf = await PATCH(new Request(`${origin}/api/books/${b.externalId}/reading`, { method: "PATCH", headers: { Origin: "https://example.invalid", "Content-Type": "application/json" }, body: JSON.stringify({ status: "READ" }) }), context);
    expect(csrf.status).toBe(403); expect(await getReading(b.externalId)).toBeNull();
  });
});
