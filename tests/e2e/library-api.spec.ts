import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) });
const createdUsers: string[] = [];
const createdBooks: string[] = [];
const origin = "http://127.0.0.1:3001";
const headers = { Origin: origin };
async function signIn(request: APIRequestContext) {
  const email = `library-api-${randomUUID()}@test.bookly.local`;
  const password = "Senha de integração 123!";
  const registration = await request.post("/api/auth/register", { headers, data: { name: "Leitor API", email, password, confirmPassword: password } });
  expect(registration.status()).toBe(201);
  const user = (await registration.json()).data;
  createdUsers.push(user.id);
  const csrfToken = (await (await request.get("/api/auth/csrf")).json()).csrfToken;
  await request.post("/api/auth/callback/credentials", { form: { email, password, csrfToken, json: "true", callbackUrl: origin } });
  expect((await request.get("/api/me")).status()).toBe(200);
  return user;
}
async function localBook() {
  // Fixture somente no banco de testes; sem depender da quota externa.
  const book = await db.book.create({ data: { externalId: `fixture-${randomUUID()}`, title: "Livro de teste de API", authors: ["Autor de teste"], pageCount: 150 } });
  createdBooks.push(book.id);
  return book;
}
test.afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: createdUsers } } });
  await db.book.deleteMany({ where: { id: { in: createdBooks } } });
  await db.$disconnect();
});

test("REST completo usa sessão real e protege ownership", async ({ request, playwright }) => {
  expect((await request.get("/api/books/search?q=Hobbit")).status()).toBe(401);
  expect((await request.get("/api/shelves")).status()).toBe(401);
  await signIn(request);
  const response = await request.post("/api/shelves", { headers, data: { name: "  FICÇÃO  ", description: "Seleção" } });
  expect(response.status()).toBe(201);
  const shelf = (await response.json()).data;
  expect((await request.post("/api/shelves", { headers, data: { name: "ficção" } })).status()).toBe(409);
  expect((await request.patch(`/api/shelves/${shelf.id}`, { headers, data: { description: "Atualizada" } })).status()).toBe(200);
  const book = await localBook();
  const path = `/api/shelves/${shelf.id}/books`;
  expect((await request.post(path, { headers, data: { externalId: book.externalId } })).status()).toBe(201);
  expect((await request.post(path, { headers, data: { externalId: book.externalId } })).status()).toBe(200);
  const listed = await request.get(`${path}?sort=author&limit=1`);
  expect((await listed.json()).meta.total).toBe(1);
  const detail = await request.get(`/api/books/${book.externalId}`);
  expect((await detail.json()).data.title).toBe(book.title);
  const other = await playwright.request.newContext({ baseURL: origin });
  try {
    await signIn(other);
    expect((await other.get(`/api/shelves/${shelf.id}`)).status()).toBe(404);
    expect((await other.post(path, { headers, data: { externalId: book.externalId } })).status()).toBe(404);
    expect((await other.delete(`/api/shelves/${shelf.id}`, { headers })).status()).toBe(404);
  } finally { await other.dispose(); }
  expect((await request.delete(`${path}/${book.id}`, { headers })).status()).toBe(204);
  expect((await request.delete(`${path}/${book.id}`, { headers })).status()).toBe(204);
  expect((await request.delete(`/api/shelves/${shelf.id}`, { headers })).status()).toBe(204);
});

test("REST sincroniza Quero ler/Lidos e preserva estantes SYSTEM", async ({ request }) => {
  const user = await signIn(request);
  const shelves = await db.shelf.findMany({ where: { userId: user.id } });
  const want = shelves.find((s) => s.systemKey === "WANT_TO_READ")!;
  const read = shelves.find((s) => s.systemKey === "READ")!;
  const favorite = shelves.find((s) => s.systemKey === "FAVORITES")!;
  const book = await localBook();
  const add = (id: string) => request.post(`/api/shelves/${id}/books`, { headers, data: { externalId: book.externalId } });
  expect((await add(favorite.id)).status()).toBe(201);
  expect(await db.readingState.count({ where: { userId: user.id, bookId: book.id } })).toBe(0);
  expect((await add(want.id)).status()).toBe(201);
  expect((await add(read.id)).status()).toBe(201);
  const state = await db.readingState.findUniqueOrThrow({ where: { userId_bookId: { userId: user.id, bookId: book.id } } });
  expect(state).toMatchObject({ status: "READ", currentPage: 150 });
  expect(state.finishedAt).toBeInstanceOf(Date);
  expect((await (await request.get(`/api/shelves/${want.id}/books`)).json()).meta.total).toBe(0);
  expect((await request.delete(`/api/shelves/${read.id}`, { headers })).status()).toBe(403);
  expect((await request.patch(`/api/shelves/${read.id}`, { headers, data: { name: "Alterado" } })).status()).toBe(403);
  expect((await request.get("/api/books/search?q=Hobbit&limit=999")).status()).toBe(400);
});
