import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) });
const users: string[] = [], books: string[] = [];
const origin = "http://127.0.0.1:3001";
async function login(request: APIRequestContext, page: Page) {
  const email = `experience-${randomUUID()}@test.bookly.local`, password = "Bookly experiência 2026!";
  const response = await request.post("/api/auth/register", { headers: { Origin: origin }, data: { name: "Clara Leitora", email, password, confirmPassword: password } });
  expect(response.status()).toBe(201); const user = (await response.json()).data as { id: string }; users.push(user.id);
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(email); await page.getByLabel("Senha", { exact: true }).fill(password); await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page).toHaveURL(/\/$/); return user;
}
test.afterAll(async () => { await db.user.deleteMany({ where: { id: { in: users } } }); await db.book.deleteMany({ where: { id: { in: books } } }); await db.$disconnect(); });

test("fluxo completo de livro, estantes e leitura com persistência real", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 1100 }); const user = await login(request, page);
  const book = await db.book.create({ data: { externalId: `experience-${randomUUID()}`, title: "O Hobbit", authors: ["J. R. R. Tolkien"], pageCount: 320, language: "pt", publishedDate: "1937-09-21", isbn13: "9780261102217", categories: ["Fantasia"], averageRating: 4.7, ratingsCount: 120, description: "Bilbo Bolseiro vive uma vida tranquila até receber uma visita inesperada. Uma jornada entre montanhas, enigmas e descobertas transforma sua maneira de enxergar o mundo." } }); books.push(book.id);
  // Somente a resposta externa de pesquisa é controlada. UI, sessão e banco são reais.
  await page.route("**/api/books/search**", (route) => route.fulfill({ json: { data: [book], meta: { total: 1, limit: 24, offset: 0, nextOffset: null } } }));
  await page.goto("/explorar"); await page.getByLabel("Buscar livros, autores ou ISBN").fill("O Hobbit"); await page.getByLabel("Buscar livros, autores ou ISBN").press("Enter"); await page.getByRole("link", { name: "O Hobbit", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "O Hobbit", exact: true })).toBeVisible();
  await expect(page.getByText("9780261102217", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Minha resenha", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Minhas anotações", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/livro-1440.png", fullPage: true });
  await page.getByRole("button", { name: "Adicionar à estante", exact: true }).click(); await page.getByRole("button", { name: "+ Nova estante", exact: true }).click();
  await page.getByLabel("Nome da estante").fill("Aventuras"); await page.getByLabel("Descrição").fill("Histórias para descobrir"); await page.getByRole("button", { name: "Criar estante", exact: true }).click();
  const add = page.getByRole("button", { name: "Aventuras", exact: true }); await expect(add).toBeEnabled(); await add.click(); await expect(page.getByRole("button", { name: "Aventuras Adicionado", exact: true })).toBeDisabled();
  const custom = await db.shelf.findFirstOrThrow({ where: { userId: user.id, name: "Aventuras" } });
  expect(await db.shelfBook.count({ where: { shelfId: custom.id, bookId: book.id } })).toBe(1);
  await page.goto(`/estantes/${custom.id}`); await expect(page.getByRole("heading", { name: "Aventuras", exact: true })).toBeVisible();
  await page.getByLabel("Ordenar livros").selectOption("title"); await expect(page).toHaveURL(/sort=title/);
  await page.getByRole("button", { name: "Editar", exact: true }).click(); await page.getByLabel("Nome da estante").fill("Grandes aventuras"); await page.getByRole("button", { name: "Salvar alterações" }).click(); await expect(page.getByRole("heading", { name: "Grandes aventuras", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remover da estante", exact: true }).click(); await page.getByRole("button", { name: "Cancelar", exact: true }).click(); expect(await db.shelfBook.count({ where: { shelfId: custom.id, bookId: book.id } })).toBe(1);
  await page.getByRole("button", { name: "Remover da estante", exact: true }).click(); await page.getByRole("button", { name: "Confirmar remoção", exact: true }).click(); await expect(page.getByText("Esta estante ainda está vazia.")).toBeVisible();
  await page.getByRole("link", { name: "Adicionar livros", exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/explorar\\?shelf=${custom.id}`)); await page.getByLabel("Buscar livros, autores ou ISBN").fill("O Hobbit"); await page.getByLabel("Buscar livros, autores ou ISBN").press("Enter"); await expect(page.getByLabel("Estante para O Hobbit")).toHaveValue(custom.id);
  await page.getByRole("button", { name: "Adicionar O Hobbit à estante selecionada" }).click(); await expect.poll(() => db.shelfBook.count({ where: { shelfId: custom.id, bookId: book.id } })).toBe(1);
  await page.goto(`/livros/${book.externalId}`); await page.getByRole("button", { name: "Favoritar", exact: true }).click(); await expect(page.getByRole("button", { name: "Favoritado", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Favoritado", exact: true }).click(); await expect(page.getByRole("button", { name: "Favoritar", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Adicionar à estante", exact: true }).click(); await page.getByRole("button", { name: "Quero ler", exact: true }).click(); await expect(page.getByRole("button", { name: "Quero ler Adicionado", exact: true })).toBeDisabled();
  await page.goto("/quero-ler"); await expect(page.getByRole("link", { name: "O Hobbit", exact: true }).last()).toBeVisible();
  await page.goto(`/livros/${book.externalId}`); await page.getByRole("button", { name: "Começar leitura", exact: true }).click(); await page.getByLabel("Página atual").fill("50"); await page.getByRole("button", { name: "Salvar leitura", exact: true }).click(); await expect(page.getByRole("button", { name: "Atualizar leitura", exact: true })).toBeVisible();
  await page.goto("/"); await expect(page.getByText("50 de 320 páginas")).toBeVisible(); await page.getByRole("button", { name: "Continuar", exact: true }).click(); await page.getByLabel("Página atual").fill("160"); await page.getByRole("button", { name: "Salvar leitura", exact: true }).click(); await expect(page.getByText("160 de 320 páginas")).toBeVisible(); await expect(page.getByText("50%", { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText("160 de 320 páginas")).toBeVisible();
  await page.goto(`/livros/${book.externalId}`); await page.getByRole("button", { name: "Marcar como lido", exact: true }).click(); await expect(page.getByRole("button", { name: "Lido", exact: true })).toBeDisabled();
  await expect.poll(() => db.readingState.findUnique({ where: { userId_bookId: { userId: user.id, bookId: book.id } } }).then((state) => state?.status)).toBe("READ");
  await page.goto("/lidos"); await expect(page.getByRole("link", { name: "O Hobbit", exact: true }).last()).toBeVisible();
  await page.goto("/quero-ler"); await expect(page.getByRole("link", { name: "O Hobbit", exact: true })).toHaveCount(0);
  await page.goto("/"); await expect(page.getByRole("button", { name: "Continuar", exact: true })).toHaveCount(0);
  await page.goto("/estantes"); await page.getByLabel("Opções de Grandes aventuras").click(); await page.getByRole("button", { name: "Excluir", exact: true }).click(); await page.getByRole("button", { name: "Confirmar remoção", exact: true }).click(); await expect(page.getByRole("heading", { name: "Grandes aventuras", exact: true })).toHaveCount(0);
  expect(await db.book.count({ where: { id: book.id } })).toBe(1);
});

test("estantes: duplicidade, sistema protegido, formulário por teclado e layout amplo", async ({ page, request }) => {
  await page.setViewportSize({ width: 1920, height: 1080 }); await login(request, page); await page.goto("/estantes");
  await expect(page.getByRole("button", { name: "Excluir", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "+ Nova estante", exact: true }).click(); await page.getByLabel("Nome da estante").fill("  favoritos  "); await page.getByRole("button", { name: "Criar estante", exact: true }).click(); await expect(page.getByRole("dialog").getByRole("alert")).toContainText("nome");
  await page.getByLabel("Nome da estante").fill("Ensaios"); await page.getByRole("button", { name: "Criar estante", exact: true }).click(); await expect(page.getByRole("heading", { name: "Ensaios", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/estantes-1920.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "+ Nova estante", exact: true }).click(); await expect(page.getByLabel("Nome da estante")).toBeFocused(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/estantes/invalid"); await expect(page.getByText("Algo deu errado")).toHaveCount(0); await expect(page.getByRole("heading").first()).toBeVisible();
});

test("detalhes exibem somente resenha e anotações próprias; API de leitura exige sessão", async ({ page, request }) => {
  const user = await login(request, page);
  const book = await db.book.create({ data: { externalId: `privacy-${randomUUID()}`, title: "Livro com registros pessoais", authors: ["Autora"], pageCount: 120 } }); books.push(book.id);
  await db.review.create({ data: { bookId: book.id, userId: user.id, rating: 5, title: "Uma descoberta", content: "Minha resenha preservada.", finishedAt: new Date("2026-09-01T00:00:00Z") } });
  await db.readingNote.create({ data: { bookId: book.id, userId: user.id, page: 12, content: "Minha anotação preservada." } });
  await page.goto(`/livros/${book.externalId}`); await expect(page.getByText("Minha resenha preservada.")).toBeVisible(); await expect(page.getByText("Minha anotação preservada.")).toBeVisible();
  await expect(page.getByText("ISBN", { exact: true })).toHaveCount(0); await expect(page.getByText("Idioma", { exact: true })).toHaveCount(0);
  const anonymous = await request.patch(`/api/books/${book.externalId}/reading`, { headers: { Origin: origin }, data: { status: "READ" } }); expect(anonymous.status()).toBe(401);
  const forged = await page.request.patch(`/api/books/${book.externalId}/reading`, { headers: { Origin: origin }, data: { status: "READ", userId: randomUUID() } }); expect(forged.status()).toBe(400);
  await page.request.patch(`/api/books/${book.externalId}/reading`, { headers: { Origin: origin }, data: { status: "READ" } });
  for (const width of [1366, 1600]) {
    await page.setViewportSize({ width, height: 1000 }); await page.reload(); await expect(page.getByRole("heading", { name: book.title, exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/registros-${width}.png`, fullPage: true });
  }
  const readShelf = await db.shelf.findFirstOrThrow({ where: { userId: user.id, systemKey: "READ" } });
  await page.goto(`/estantes/${readShelf.id}`); await expect(page.getByRole("button", { name: "Editar", exact: true })).toHaveCount(0); await page.screenshot({ path: "test-results/estante-individual.png", fullPage: true });
  await page.goto("/lidos"); await expect(page.getByRole("link", { name: book.title, exact: true }).last()).toBeVisible(); await page.screenshot({ path: "test-results/lidos.png", fullPage: true });
});
