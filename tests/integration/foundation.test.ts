import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import { getDb } from "@/lib/db";
import { registerUser, authenticateGoogleUser, authenticateUser } from "@/features/auth/auth.service";
import { consumeAuthAttempt } from "@/features/auth/rate-limit";
import { deleteShelf } from "@/features/shelves/shelf.service";
import { requireApiUser } from "@/lib/current-user";

vi.mock("@/lib/current-user", () => ({ requireApiUser: vi.fn() }));

const db = getDb();
const runId = randomUUID();
const userIds: string[] = [];
const bookIds: string[] = [];
function registration(label: string) {
  return { name: "Leitor Teste", email: `${label}-${runId}@test.bookly.local`, password: "Senha segura 123!", confirmPassword: "Senha segura 123!" };
}
async function createUser(label: string) {
  const input = registration(label);
  const user = await registerUser(input);
  userIds.push(user.id);
  return { user, input };
}

afterAll(async () => {
  // Limpeza apenas dos registros criados por esta execução no banco de testes.
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.book.deleteMany({ where: { id: { in: bookIds } } });
  await db.$disconnect();
});

describe("fundação em PostgreSQL real", () => {
  it("cadastra com hash e três estantes SYSTEM, sem expor hash", async () => {
    const { user, input } = await createUser("cadastro");
    expect(user).not.toHaveProperty("passwordHash");
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { shelves: true } });
    expect(stored.passwordHash).not.toBe(input.password);
    expect(await bcrypt.compare(input.password, stored.passwordHash!)).toBe(true);
    expect(stored.shelves.map((s) => s.systemKey).sort()).toEqual(["FAVORITES", "READ", "WANT_TO_READ"]);
    expect(stored.shelves.every((s) => s.type === "SYSTEM")).toBe(true);
  });
  it("recusa e-mail duplicado mesmo com caixa diferente", async () => {
    const { input } = await createUser("duplicado");
    await expect(registerUser({ ...input, email: input.email.toUpperCase() })).rejects.toMatchObject({ code: "EMAIL_IN_USE", status: 409 });
  });
  it("recusa userId injetado pelo cliente", async () => {
    await expect(registerUser({ ...registration("injetado"), userId: randomUUID() })).rejects.toThrow();
  });
  it("aceita credenciais válidas e rejeita senha/conta incorretas", async () => {
    const { user, input } = await createUser("login");
    expect(await authenticateUser(input)).toMatchObject({ id: user.id });
    expect(await authenticateUser({ ...input, password: "Senha errada 123!" })).toBeNull();
    expect(await authenticateUser(registration("inexistente"))).toBeNull();
  });
  it("cria uma conta Google de forma idempotente com as estantes padrão", async () => {
    const identity = { googleId: `google-${runId}`, email: `google-${runId}@test.bookly.local`, name: "Leitora Google", avatarUrl: "https://example.com/avatar.png" };
    const first = await authenticateGoogleUser(identity);
    userIds.push(first.id);
    const second = await authenticateGoogleUser(identity);
    const stored = await db.user.findUniqueOrThrow({ where: { id: first.id }, include: { shelves: true } });
    expect(second.id).toBe(first.id);
    expect(stored.passwordHash).toBeNull();
    expect(stored.googleId).toBe(identity.googleId);
    expect(stored.shelves.map((shelf) => shelf.systemKey).sort()).toEqual(["FAVORITES", "READ", "WANT_TO_READ"]);
  });
  it("vincula o Google à conta local com o mesmo e-mail verificado", async () => {
    const { user, input } = await createUser("vinculo-google");
    const linked = await authenticateGoogleUser({ googleId: `linked-${runId}`, email: input.email, name: "Outro nome", avatarUrl: null });
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(linked.id).toBe(user.id);
    expect(stored.googleId).toBe(`linked-${runId}`);
    expect(stored.passwordHash).not.toBeNull();
    expect(stored.name).toBe("Leitor Teste");
  });
  it("cadastro concorrente mantém um único usuário e três estantes", async () => {
    const input = registration("concorrente");
    const results = await Promise.allSettled([registerUser(input), registerUser(input)]);
    const stored = await db.user.findUniqueOrThrow({ where: { email: input.email }, include: { shelves: true } });
    userIds.push(stored.id);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(stored.shelves).toHaveLength(3);
  });
  it("protege estantes SYSTEM no serviço e no banco", async () => {
    const { user } = await createUser("sistema");
    vi.mocked(requireApiUser).mockResolvedValue(user);
    const shelf = await db.shelf.findFirstOrThrow({ where: { userId: user.id } });
    await expect(deleteShelf(shelf.id)).rejects.toMatchObject({ code: "SYSTEM_SHELF_PROTECTED" });
    await expect(db.shelf.delete({ where: { id: shelf.id } })).rejects.toThrow();
    await expect(db.shelf.update({ where: { id: shelf.id }, data: { type: "CUSTOM", systemKey: null } })).rejects.toThrow();
  });
  it("impede excluir estante de outro usuário; permite excluir customizada própria", async () => {
    const { user: owner } = await createUser("dono");
    const { user: visitor } = await createUser("visitante");
    const shelf = await db.shelf.create({ data: { userId: owner.id, name: "Programação", normalizedName: "programação", type: "CUSTOM" } });
    vi.mocked(requireApiUser).mockResolvedValue(visitor);
    await expect(deleteShelf(shelf.id)).rejects.toMatchObject({ code: "SHELF_NOT_FOUND" });
    expect(await db.shelf.count({ where: { id: shelf.id } })).toBe(1);
    vi.mocked(requireApiUser).mockResolvedValue(owner);
    await deleteShelf(shelf.id);
    expect(await db.shelf.count({ where: { id: shelf.id } })).toBe(0);
  });
  it("mantém limites de rating, páginas, unicidade e relações", async () => {
    const { user } = await createUser("constraints");
    const book = await db.book.create({ data: { externalId: `test-${runId}`, title: "Livro de teste", pageCount: 100 } });
    bookIds.push(book.id);
    const shelf = await db.shelf.findFirstOrThrow({ where: { userId: user.id } });
    await db.shelfBook.create({ data: { shelfId: shelf.id, bookId: book.id } });
    await expect(db.shelfBook.create({ data: { shelfId: shelf.id, bookId: book.id } })).rejects.toThrow();
    const review = { userId: user.id, bookId: book.id, content: "Uma leitura interessante." };
    await expect(db.review.create({ data: { ...review, rating: 6 } })).rejects.toThrow();
    await db.review.create({ data: { ...review, rating: 4 } });
    await expect(db.review.create({ data: { ...review, rating: 5 } })).rejects.toThrow();
    await expect(db.readingState.create({ data: { userId: user.id, bookId: book.id, currentPage: -1 } })).rejects.toThrow();
    await expect(db.readingState.create({ data: { userId: user.id, bookId: book.id, currentPage: 101 } })).rejects.toThrow();
    await db.readingState.create({ data: { userId: user.id, bookId: book.id, currentPage: 50, status: "READING", startedAt: new Date() } });
    await expect(db.book.update({ where: { id: book.id }, data: { pageCount: 40 } })).rejects.toThrow();
    await expect(db.readingNote.create({ data: { userId: user.id, bookId: book.id, page: 101, content: "Nota" } })).rejects.toThrow();
    await db.readingNote.createMany({ data: [{ userId: user.id, bookId: book.id, page: 20, content: "Primeira nota" }, { userId: user.id, bookId: book.id, content: "Segunda nota" }] });
    expect(await db.readingNote.count({ where: { userId: user.id, bookId: book.id } })).toBe(2);
  });
  it("limita tentativas usando contagem atômica no banco", async () => {
    const email = registration("limite").email;
    const results = await Promise.allSettled(Array.from({ length: 11 }, () => consumeAuthAttempt("login", email)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
});
