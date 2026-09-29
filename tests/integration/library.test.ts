import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requireApiUser } from "@/lib/current-user";
import { registerUser } from "@/features/auth/auth.service";
import { ensureBookExists, getBookDetails, searchBooks } from "@/features/books/book.service";
import { createShelf, deleteShelf, getShelf, listShelves, updateShelf } from "@/features/shelves/shelf.service";
import { addBookToShelf, listShelfBooks, removeBookFromShelf } from "@/features/shelves/shelf-book.service";
import { GET as searchRoute } from "@/app/api/books/search/route";
import { GET as bookRoute } from "@/app/api/books/[externalId]/route";
import { GET as listRoute, POST as createRoute } from "@/app/api/shelves/route";
import { GET as detailRoute, PATCH as updateRoute, DELETE as deleteRoute } from "@/app/api/shelves/[id]/route";
import { GET as booksRoute, POST as addRoute } from "@/app/api/shelves/[id]/books/route";
import { DELETE as removeRoute } from "@/app/api/shelves/[id]/books/[bookId]/route";

vi.mock("@/lib/current-user", () => ({ requireApiUser: vi.fn() }));
const db = getDb();
const runId = randomUUID();
const prefix = `library-${runId}-`;
type CurrentUser = Awaited<ReturnType<typeof requireApiUser>>;
let owner: CurrentUser;
let visitor: CurrentUser;
const userIds: string[] = [];
const externalId = () => `${prefix}${randomUUID()}`;
const rawVolume = (id: string) => ({ id, volumeInfo: { title: "Livro de integração", authors: ["Autora de teste"], pageCount: 100 } });
const fetchMock = vi.fn(async (input: URL | string | Request) => {
  const url = new URL(String(input));
  return Response.json(url.pathname.endsWith("/volumes") ? { totalItems: 1, items: [rawVolume(`${prefix}search`)] } : rawVolume(decodeURIComponent(url.pathname.split("/").at(-1) ?? "")));
});
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function request(method: string, pathname: string, body?: unknown) {
  const origin = new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").origin;
  return new Request(`${origin}${pathname}`, { method, headers: { Origin: origin, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

beforeAll(async () => {
  const password = "Senha teste segura 123!";
  owner = await registerUser({ name: "Leitor dono", email: `owner-${runId}@test.bookly.local`, password, confirmPassword: password }); userIds.push(owner.id);
  visitor = await registerUser({ name: "Leitor visitante", email: `visitor-${runId}@test.bookly.local`, password, confirmPassword: password }); userIds.push(visitor.id);
});
beforeEach(() => { vi.mocked(requireApiUser).mockResolvedValue(owner); fetchMock.mockClear(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.book.deleteMany({ where: { externalId: { startsWith: prefix } } });
  await db.$disconnect();
});

describe("livros e persistência", () => {
  it("pesquisa e detalhe normalizados sem salvar os resultados", async () => {
    const id = externalId();
    expect((await searchBooks({ q: "Hobbit" })).items[0]).toHaveProperty("externalId");
    expect((await getBookDetails(id)).title).toBe("Livro de integração");
    expect(await db.book.count({ where: { externalId: { in: [id, `${prefix}search`] } } })).toBe(0);
  });
  it("ensureBookExists reutiliza registros e é seguro sob concorrência", async () => {
    const id = externalId();
    const results = await Promise.all(Array.from({ length: 5 }, () => ensureBookExists(id)));
    expect(new Set(results.map((book) => book.id)).size).toBe(1);
    expect(await db.book.count({ where: { externalId: id } })).toBe(1);
    fetchMock.mockClear();
    expect((await ensureBookExists(id)).id).toBe(results[0]?.id);
    expect((await getBookDetails(id)).externalId).toBe(id);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("falha do provedor não deixa livro ou vínculo incompleto", async () => {
    const shelf = await createShelf({ name: "Falha externa" });
    const id = externalId();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));
    await expect(addBookToShelf(shelf.id, { externalId: id })).rejects.toMatchObject({ code: "BOOK_PROVIDER_LIMITED" });
    expect(await db.book.count({ where: { externalId: id } })).toBe(0);
    expect((await getShelf(shelf.id)).bookCount).toBe(0);
  });
});

describe("CRUD e autorização de estantes", () => {
  it("cria, lista, renomeia, limpa descrição e exclui customizada", async () => {
    const shelf = await createShelf({ name: "  Meus   livros  ", description: "  Primeira seleção  " });
    expect(shelf).toMatchObject({ name: "Meus livros", description: "Primeira seleção", type: "CUSTOM", systemKey: null, bookCount: 0 });
    expect((await listShelves({ limit: 40 })).items.map((s) => s.id)).toContain(shelf.id);
    expect(await updateShelf(shelf.id, { name: "Livros técnicos", description: "" })).toMatchObject({ name: "Livros técnicos", description: null });
    await deleteShelf(shelf.id);
    await expect(getShelf(shelf.id)).rejects.toMatchObject({ code: "SHELF_NOT_FOUND" });
  });
  it("recusa nomes duplicados por caixa, espaços, acentos e normalização Unicode", async () => {
    await createShelf({ name: "FICÇÃO   CIENTÍFICA" });
    await expect(createShelf({ name: "  ficção científica " })).rejects.toMatchObject({ code: "SHELF_NAME_IN_USE", status: 409 });
    await expect(createShelf({ name: "ficção científica".normalize("NFD") })).rejects.toMatchObject({ code: "SHELF_NAME_IN_USE" });
    const other = await createShelf({ name: "Outra estante" });
    await expect(updateShelf(other.id, { name: "Ficção Científica" })).rejects.toMatchObject({ code: "SHELF_NAME_IN_USE" });
    vi.mocked(requireApiUser).mockResolvedValue(visitor);
    expect((await createShelf({ name: "Ficção Científica" })).type).toBe("CUSTOM");
  });
  it("unicidade também vale sob criação simultânea", async () => {
    const results = await Promise.allSettled([createShelf({ name: "Concorrência" }), createShelf({ name: " CONCORRÊNCIA " })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it.each([{ name: " " }, { name: "a".repeat(81) }, { name: "Válida", userId: "forjado" }, { name: "Válida", type: "SYSTEM" }])("rejeita dados inválidos: %j", async (input) => {
    await expect(createShelf(input)).rejects.toThrow();
  });
  it("nega leitura, edição, exclusão e vínculos de outro proprietário sem consultar Google", async () => {
    const shelf = await createShelf({ name: "Privada" });
    vi.mocked(requireApiUser).mockResolvedValue(visitor);
    for (const operation of [() => getShelf(shelf.id), () => updateShelf(shelf.id, { name: "Invasão" }), () => deleteShelf(shelf.id),
      () => listShelfBooks(shelf.id), () => addBookToShelf(shelf.id, { externalId: externalId() }), () => removeBookFromShelf(shelf.id, randomUUID())]) {
      await expect(operation()).rejects.toMatchObject({ code: "SHELF_NOT_FOUND", status: 404 });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await listShelves({ limit: 40 })).items.map((s) => s.id)).not.toContain(shelf.id);
  });
  it("estantes SYSTEM não podem ser editadas, excluídas ou duplicadas", async () => {
    const shelf = await db.shelf.findFirstOrThrow({ where: { userId: owner.id, systemKey: "FAVORITES" } });
    await expect(deleteShelf(shelf.id)).rejects.toMatchObject({ code: "SYSTEM_SHELF_PROTECTED" });
    await expect(updateShelf(shelf.id, { description: "Mudança" })).rejects.toMatchObject({ code: "SYSTEM_SHELF_PROTECTED" });
    await expect(createShelf({ name: " favoritos " })).rejects.toMatchObject({ code: "SHELF_NAME_IN_USE" });
  });
});

describe("livros nas estantes", () => {
  it("adiciona de forma idempotente e concorrente; remove sem apagar o livro", async () => {
    const shelf = await createShelf({ name: "Idempotência" });
    const id = externalId();
    const results = await Promise.all(Array.from({ length: 5 }, () => addBookToShelf(shelf.id, { externalId: id })));
    expect(results.filter((r) => r.added)).toHaveLength(1);
    const book = results[0]!.book;
    const again = await addBookToShelf(shelf.id, { externalId: id });
    expect(again.added).toBe(false);
    expect(again.addedAt).toEqual(results[0]?.addedAt);
    expect((await getShelf(shelf.id)).bookCount).toBe(1);
    expect((await listShelfBooks(shelf.id)).items).toHaveLength(1);
    expect(await removeBookFromShelf(shelf.id, book.id)).toEqual({ removed: true });
    expect(await removeBookFromShelf(shelf.id, book.id)).toEqual({ removed: false });
    expect((await listShelfBooks(shelf.id)).items).toHaveLength(0);
    expect(await db.book.findUnique({ where: { id: book.id } })).not.toBeNull();
  });
  it("ordena por título/autor e pagina resultados", async () => {
    const shelf = await createShelf({ name: "Ordenação" });
    for (const [title, author] of [["Zulu", "Alice"], ["Árvore", "Zeca"], ["Baleia", "Bruna"]]) {
      const book = await db.book.create({ data: { externalId: externalId(), title: title!, authors: [author!] } });
      await addBookToShelf(shelf.id, { externalId: book.externalId });
    }
    const page = await listShelfBooks(shelf.id, { sort: "author", limit: 2 });
    expect(page.total).toBe(3);
    expect(page.items.map((i) => i.book.authors[0])).toEqual(["Alice", "Bruna"]);
    expect((await listShelfBooks(shelf.id, { sort: "author", limit: 2, offset: 2 })).items[0]?.book.authors[0]).toBe("Zeca");
    expect((await listShelfBooks(shelf.id, { sort: "title", limit: 1 })).items[0]?.book.title).toBe("Baleia");
  });
  it("revalida ownership após a consulta externa sem persistência parcial", async () => {
    const shelf = await createShelf({ name: "Exclusão concorrente" });
    const id = externalId();
    fetchMock.mockImplementationOnce(async () => {
      await db.shelf.delete({ where: { id: shelf.id } });
      return Response.json(rawVolume(id));
    });
    await expect(addBookToShelf(shelf.id, { externalId: id })).rejects.toMatchObject({ code: "SHELF_NOT_FOUND" });
    expect(await db.book.count({ where: { externalId: id } })).toBe(0);
  });
  it("Quero ler → Lidos sincroniza estado, página, data e estantes", async () => {
    const want = await db.shelf.findFirstOrThrow({ where: { userId: owner.id, systemKey: "WANT_TO_READ" } });
    const read = await db.shelf.findFirstOrThrow({ where: { userId: owner.id, systemKey: "READ" } });
    const id = externalId();
    const first = await addBookToShelf(want.id, { externalId: id });
    const where = { userId_bookId: { userId: owner.id, bookId: first.book.id } };
    expect((await db.readingState.findUniqueOrThrow({ where })).status).toBe("WANT_TO_READ");
    await addBookToShelf(read.id, { externalId: id });
    const finished = await db.readingState.findUniqueOrThrow({ where });
    expect(finished).toMatchObject({ status: "READ", currentPage: 100 });
    expect(finished.finishedAt).toBeInstanceOf(Date);
    expect(await db.shelfBook.count({ where: { shelfId: want.id, bookId: first.book.id } })).toBe(0);
    await addBookToShelf(read.id, { externalId: id });
    expect((await db.readingState.findUniqueOrThrow({ where })).finishedAt).toEqual(finished.finishedAt);
    await removeBookFromShelf(read.id, first.book.id);
    expect((await db.readingState.findUniqueOrThrow({ where })).status).toBe("READ");
  });
  it("Quero ler preserva READING/READ; favoritos não cria nem altera estado", async () => {
    const want = await db.shelf.findFirstOrThrow({ where: { userId: owner.id, systemKey: "WANT_TO_READ" } });
    const favorites = await db.shelf.findFirstOrThrow({ where: { userId: owner.id, systemKey: "FAVORITES" } });
    const id = externalId();
    const result = await addBookToShelf(favorites.id, { externalId: id });
    expect(await db.readingState.count({ where: { userId: owner.id, bookId: result.book.id } })).toBe(0);
    const state = await db.readingState.create({ data: { userId: owner.id, bookId: result.book.id, status: "READING", currentPage: 25, startedAt: new Date() } });
    await addBookToShelf(want.id, { externalId: id });
    await addBookToShelf(favorites.id, { externalId: id });
    expect(await db.readingState.findUnique({ where: { id: state.id } })).toEqual(state);
    await db.readingState.update({ where: { id: state.id }, data: { status: "READ", finishedAt: new Date() } });
    await addBookToShelf(want.id, { externalId: id });
    expect((await db.readingState.findUniqueOrThrow({ where: { id: state.id } })).status).toBe("READ");
  });
  it("conclui livro sem pageCount e sem inventar número de páginas", async () => {
    const read = await db.shelf.findFirstOrThrow({ where: { userId: owner.id, systemKey: "READ" } });
    const book = await db.book.create({ data: { externalId: externalId(), title: "Sem paginação" } });
    await addBookToShelf(read.id, { externalId: book.externalId });
    expect(await db.readingState.findUnique({ where: { userId_bookId: { userId: owner.id, bookId: book.id } } })).toMatchObject({ status: "READ", currentPage: 0 });
  });
});

describe("contratos dos Route Handlers com services e PostgreSQL reais", () => {
  it("executa CRUD e vínculos pelos endpoints com os status corretos", async () => {
    const created = await createRoute(request("POST", "/api/shelves", { name: "Estante via HTTP" }));
    expect(created.status).toBe(201);
    const { data: shelf } = await created.json();
    expect((await listRoute(request("GET", "/api/shelves"))).status).toBe(200);
    expect((await detailRoute(request("GET", `/api/shelves/${shelf.id}`), context(shelf.id))).status).toBe(200);
    expect((await updateRoute(request("PATCH", `/api/shelves/${shelf.id}`, { description: "Via API" }), context(shelf.id))).status).toBe(200);
    const id = externalId();
    const added = await addRoute(request("POST", `/api/shelves/${shelf.id}/books`, { externalId: id }), context(shelf.id));
    expect(added.status).toBe(201);
    const { data: entry } = await added.json();
    expect((await addRoute(request("POST", `/api/shelves/${shelf.id}/books`, { externalId: id }), context(shelf.id))).status).toBe(200);
    const listed = await booksRoute(request("GET", `/api/shelves/${shelf.id}/books?limit=1`), context(shelf.id));
    expect((await listed.json()).meta.total).toBe(1);
    expect(listed.headers.get("cache-control")).toBe("private, no-store");
    expect((await removeRoute(request("DELETE", `/api/shelves/${shelf.id}/books/${entry.book.id}`), { params: Promise.resolve({ id: shelf.id, bookId: entry.book.id }) })).status).toBe(204);
    expect((await deleteRoute(request("DELETE", `/api/shelves/${shelf.id}`), context(shelf.id))).status).toBe(204);
  });
  it("pesquisa e detalhe expõem somente metadados normalizados", async () => {
    const result = await searchRoute(request("GET", "/api/books/search?q=Hobbit&mode=title&limit=2"));
    expect(result.status).toBe(200);
    expect((await result.json()).data[0]).toHaveProperty("title");
    const detail = await bookRoute(request("GET", "/api/books/detail"), { params: Promise.resolve({ externalId: externalId() }) });
    expect(detail.status).toBe(200);
    expect((await detail.json()).data).not.toHaveProperty("volumeInfo");
  });
  it("valida query, corpo, origem, ownership e sessão", async () => {
    expect((await searchRoute(request("GET", "/api/books/search?q=x&limit=100"))).status).toBe(400);
    expect((await searchRoute(request("GET", "/api/books/search?q=Hobbit&q=Tolkien"))).status).toBe(400);
    expect((await createRoute(request("POST", "/api/shelves", { name: " " }))).status).toBe(400);
    const unsafe = new Request("http://localhost:3000/api/shelves", { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: JSON.stringify({ name: "Unsafe" }) });
    expect((await createRoute(unsafe)).status).toBe(403);
    const shelf = await createShelf({ name: "Ownership via HTTP" });
    vi.mocked(requireApiUser).mockResolvedValue(visitor);
    expect((await detailRoute(request("GET", `/api/shelves/${shelf.id}`), context(shelf.id))).status).toBe(404);
    vi.mocked(requireApiUser).mockRejectedValue(new AppError("UNAUTHENTICATED", "Entre na sua conta para continuar.", 401));
    expect((await listRoute(request("GET", "/api/shelves"))).status).toBe(401);
    expect((await searchRoute(request("GET", "/api/books/search?q=Hobbit"))).status).toBe(200);
  });
});
