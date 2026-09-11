import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) });
const createdUsers: string[] = [];
const createdBooks: string[] = [];
const origin = "http://127.0.0.1:3001";
const password = "Bookly Interface 2026!";

async function registerAndLogin(request: APIRequestContext, page: Page) {
  const email = `interface-${randomUUID()}@test.bookly.local`;
  const registration = await request.post("/api/auth/register", { headers: { Origin: origin }, data: { name: "Marina Leitora", email, password, confirmPassword: password } });
  expect(registration.status()).toBe(201);
  const user = (await registration.json()).data as { id: string };
  createdUsers.push(user.id);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  return user;
}

async function createBook(externalId: string, title: string, author: string, pageCount: number) {
  const book = await db.book.create({ data: { externalId, title, authors: [author], pageCount, averageRating: 4.5 } });
  createdBooks.push(book.id);
  return book;
}

test.afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: createdUsers } } });
  await db.book.deleteMany({ where: { id: { in: createdBooks } } });
  await db.$disconnect();
});

test("Home usa dados persistidos e mantém a composição clean", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const user = await registerAndLogin(request, page);
  const [architecture, design, pragmatic] = await Promise.all([
    createBook(`ui-architecture-${randomUUID()}`, "Arquitetura Limpa", "Robert C. Martin", 440),
    createBook(`ui-design-${randomUUID()}`, "O Design do Dia a Dia", "Don Norman", 272),
    createBook(`ui-pragmatic-${randomUUID()}`, "O Programador Pragmático", "David Thomas", 352),
  ]);
  const shelves = await db.shelf.findMany({ where: { userId: user.id } });
  const favorite = shelves.find((shelf) => shelf.systemKey === "FAVORITES")!;
  await db.$transaction([
    db.shelfBook.create({ data: { shelfId: favorite.id, bookId: design.id } }),
    db.readingState.create({ data: { userId: user.id, bookId: architecture.id, status: "READING", currentPage: 318, startedAt: new Date() } }),
    db.readingState.create({ data: { userId: user.id, bookId: pragmatic.id, status: "READING", currentPage: 80, startedAt: new Date() } }),
    db.review.create({ data: { userId: user.id, bookId: design.id, rating: 5, content: "Uma leitura muito clara sobre objetos e interfaces." } }),
    db.review.create({ data: { userId: user.id, bookId: pragmatic.id, rating: 4, content: "Conselhos práticos que continuam atuais." } }),
  ]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta, Marina" })).toBeVisible();
  await expect(page.getByText("318 de 440 páginas")).toBeVisible();
  await expect(page.getByText("72%")).toBeVisible();
  await expect(page.getByRole("link", { name: /Favoritos 1 livro/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "O Design do Dia a Dia" })).toBeVisible();
  await expect(page.getByText(/meta de leitura/i)).toHaveCount(0);
  await expect(page.getByText(/notificaç/i)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("busca global, debounce, resultado e inclusão em estante funcionam", async ({ page, request }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const user = await registerAndLogin(request, page);
  const externalId = `ui-search-${randomUUID()}`;
  const book = await createBook(externalId, "Arquitetura Limpa", "Robert C. Martin", 440);
  let searchRequests = 0;
  await page.route("**/api/books/search**", async (route) => {
    searchRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ externalId, title: book.title, subtitle: null, authors: book.authors, description: null, coverUrl: null, categories: [], publisher: null, publishedDate: null, pageCount: book.pageCount, language: "pt-BR", isbn10: null, isbn13: null, averageRating: 4.5, ratingsCount: 20 }], meta: { total: 1, limit: 24, offset: 0, nextOffset: null } }) });
  });
  const globalSearch = page.getByLabel("Buscar livros, autores ou ISBN");
  await globalSearch.fill("Arquitetura Limpa");
  await globalSearch.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("Arquitetura Limpa");
  await expect(page.getByRole("link", { name: "Arquitetura Limpa", exact: true }).last()).toBeVisible();
  await page.goto("/explorar");
  searchRequests = 0;
  const exploreSearch = page.getByLabel("Buscar por título, autor ou ISBN");
  await exploreSearch.fill("A");
  await exploreSearch.fill("Arquitetura Limpa");
  await expect(page.getByRole("link", { name: "Arquitetura Limpa", exact: true }).last()).toBeVisible();
  expect(searchRequests).toBe(1);
  const shelf = await db.shelf.findFirstOrThrow({ where: { userId: user.id, systemKey: "FAVORITES" } });
  await page.getByLabel("Estante para Arquitetura Limpa").selectOption(shelf.id);
  await page.getByRole("button", { name: "Adicionar Arquitetura Limpa à estante selecionada" }).click();
  await expect(page.getByRole("status")).toContainText("Livro adicionado à estante.");
  await expect.poll(() => db.shelfBook.count({ where: { shelfId: shelf.id, bookId: book.id } })).toBe(1);
  await page.getByRole("button", { name: "Adicionar Arquitetura Limpa à estante selecionada" }).click();
  await expect.poll(() => db.shelfBook.count({ where: { shelfId: shelf.id, bookId: book.id } })).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("exploração apresenta erro recuperável, ausência de capa e resultado vazio", async ({ page, request }) => {
  await registerAndLogin(request, page);
  let shouldFail = true;
  await page.route("**/api/books/search**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "falha temporária" && shouldFail) {
      shouldFail = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "A busca está temporariamente indisponível." } }) });
      return;
    }
    const data = query === "sem resultados" ? [] : [{ externalId: "ui-sem-capa", title: "Livro sem capa", subtitle: null, authors: [], description: null, coverUrl: null, categories: [], publisher: null, publishedDate: null, pageCount: null, language: null, isbn10: null, isbn13: null, averageRating: null, ratingsCount: null }];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data, meta: { total: data.length, limit: 24, offset: 0, nextOffset: null } }) });
  });
  await page.goto("/explorar");
  const search = page.getByLabel("Buscar por título, autor ou ISBN");
  await search.fill("falha temporária");
  await expect(page.getByText("A busca está temporariamente indisponível.")).toBeVisible();
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("link", { name: "Livro sem capa", exact: true }).last()).toBeVisible();
  await expect(page.getByText("Autor não informado")).toBeVisible();
  await search.fill("sem resultados");
  await expect(page.getByText("Nenhum livro encontrado.")).toBeVisible();
});

test("shell permanece contido em tela ampla e dropdown da conta é funcional", async ({ page, request }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await registerAndLogin(request, page);
  await page.getByRole("button", { name: "Abrir menu da conta de Marina Leitora" }).click();
  await expect(page.getByRole("menuitem", { name: "Configurações" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Sair", exact: true })).toBeVisible();
  const mainWidth = await page.locator("main").evaluate((element) => element.getBoundingClientRect().width);
  expect(mainWidth).toBeLessThanOrEqual(1520);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("todas as rotas da navegação renderizam conteúdo autenticado", async ({ page, request }) => {
  const user = await registerAndLogin(request, page);
  const routes = [
    ["/", "Bem-vindo de volta, Marina"], ["/explorar", "Explorar livros"],
    ["/estantes", "Minhas estantes"], ["/lidos", "Lidos"],
    ["/quero-ler", "Quero ler"], ["/resenhas", "Minhas resenhas"],
    ["/configuracoes", "Configurações"],
  ] as const;
  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByText("Algo deu errado")).toHaveCount(0);
  }
  const shelf = await db.shelf.findFirstOrThrow({ where: { userId: user.id, systemKey: "FAVORITES" } });
  await page.goto(`/estantes/${shelf.id}`);
  await expect(page.getByRole("heading", { name: "Favoritos", exact: true })).toBeVisible();
  const book = await createBook(`ui-detail-${randomUUID()}`, "Livro para detalhes", "Autora de teste", 180);
  await page.goto(`/livros/${book.externalId}`);
  await expect(page.getByRole("heading", { name: book.title, exact: true })).toBeVisible();
});
