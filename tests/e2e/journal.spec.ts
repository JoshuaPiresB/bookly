import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) });
const users: string[] = [], books: string[] = [];
const origin = "http://127.0.0.1:3001";
async function login(request: APIRequestContext, page: Page) {
  const email = `journal-${randomUUID()}@test.bookly.local`, password = "Diário Bookly 2026!";
  const response = await request.post("/api/auth/register", { headers: { Origin: origin }, data: { name: "Clara Leitora", email, password, confirmPassword: password } });
  expect(response.status()).toBe(201); const user = (await response.json()).data as { id: string }; users.push(user.id);
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(email); await page.getByLabel("Senha", { exact: true }).fill(password); await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page).toHaveURL(/\/$/);
  const book = await db.book.create({ data: { externalId: `journal-${randomUUID()}`, title: "O diário de uma leitora", authors: ["Autora de teste"], pageCount: 180, description: "Uma leitura que convida a registrar descobertas e impressões." } }); books.push(book.id);
  return { user, book };
}
test.afterAll(async () => { await db.user.deleteMany({ where: { id: { in: users } } }); await db.book.deleteMany({ where: { id: { in: books } } }); await db.$disconnect(); });

test("resenha: criar, Home, editar em Minhas Resenhas e excluir com confirmação", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const { user, book } = await login(request, page);
  await page.goto(`/livros/${book.externalId}`);
  await page.getByRole("button", { name: "Escrever resenha", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Salvar resenha", exact: true })).toBeDisabled();
  await dialog.getByRole("radio", { name: "4 estrelas", exact: true }).check();
  await dialog.getByLabel("Título").fill("Uma descoberta importante");
  await dialog.getByLabel("O que você achou deste livro?").fill("Uma leitura que merece ser revisitada.\nGostei especialmente da conclusão.");
  await dialog.getByLabel("Data de conclusão").fill("2026-09-02"); await dialog.getByLabel("Visibilidade").selectOption("public");
  await page.screenshot({ path: "test-results/resenha-dialog.png", fullPage: true });
  await dialog.getByRole("button", { name: "Salvar resenha", exact: true }).click();
  await expect(dialog).toHaveCount(0); await expect(page.getByRole("status").filter({ hasText: "Resenha salva." })).toBeVisible();
  const reviewRegion = page.getByRole("region", { name: "Minha resenha", exact: true });
  await expect(reviewRegion.getByText("Uma descoberta importante", { exact: true })).toBeVisible();
  await expect(reviewRegion.getByText("Pública", { exact: true })).toBeVisible();
  await expect(reviewRegion.getByRole("button", { name: "Escrever resenha" })).toHaveCount(0);
  const stored = await db.review.findUniqueOrThrow({ where: { userId_bookId: { userId: user.id, bookId: book.id } } });
  expect(stored.isPublic).toBe(true); expect(stored.finishedAt?.toISOString()).toBe("2026-09-02T00:00:00.000Z");
  const duplicate = await page.request.post("/api/reviews", { headers: { Origin: origin }, data: { externalId: book.externalId, rating: 5, content: "Duplicada" } }); expect(duplicate.status()).toBe(409);
  await page.goto("/"); await expect(page.getByRole("region", { name: "Últimas resenhas" }).getByText("Uma descoberta importante")).toBeVisible();
  await page.goto("/resenhas"); const card = page.locator("article").filter({ hasText: book.title });
  await expect(card.getByRole("heading", { name: book.title, exact: true }).getByRole("link")).toBeVisible();
  await card.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(dialog.getByRole("radio", { name: "4 estrelas", exact: true })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: "4 estrelas", exact: true })).toBeFocused(); await page.keyboard.press("ArrowRight"); await expect(dialog.getByRole("radio", { name: "5 estrelas", exact: true })).toBeChecked(); await dialog.getByLabel("Título").fill("");
  await dialog.getByLabel("O que você achou deste livro?").fill("Minha opinião atualizada."); await dialog.getByLabel("Visibilidade").selectOption("private");
  await dialog.getByRole("button", { name: "Salvar resenha", exact: true }).click(); await expect(dialog).toHaveCount(0); await expect(page.getByRole("status").filter({ hasText: "Resenha atualizada." })).toBeVisible();
  await expect(card.getByText("Minha opinião atualizada.", { exact: true })).toBeVisible(); await expect(card.getByText("Privada", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/minhas-resenhas.png", fullPage: true });
  await page.reload(); await expect(card.getByText("Minha opinião atualizada.", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Excluir", exact: true }).click(); await dialog.getByRole("button", { name: "Cancelar", exact: true }).click(); await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Excluir", exact: true }).click(); await dialog.getByRole("button", { name: "Confirmar remoção", exact: true }).click(); await expect(dialog).toHaveCount(0); await expect(page.getByRole("status").filter({ hasText: "Resenha excluída." })).toBeVisible();
  await expect(page.getByText("Você ainda não escreveu nenhuma resenha.")).toBeVisible(); expect(await db.review.count({ where: { id: stored.id } })).toBe(0);
  await page.goto(`/livros/${book.externalId}`); await expect(page.getByRole("button", { name: "Escrever resenha", exact: true })).toBeVisible();
});

test("anotações: sem página, validação, edição e remoção sem recarga manual", async ({ page, request }) => {
  await page.setViewportSize({ width: 1366, height: 1000 }); const { book } = await login(request, page);
  await page.goto(`/livros/${book.externalId}`); const region = page.getByRole("region", { name: "Minhas anotações" });
  await region.getByRole("button", { name: "+ Nova anotação", exact: true }).click(); const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Anotação", { exact: true }).fill("Primeira reflexão sem página."); await dialog.getByRole("button", { name: "Salvar anotação" }).click();
  await expect(dialog).toHaveCount(0); await expect(page.getByRole("status").filter({ hasText: "Anotação adicionada." })).toBeVisible(); await expect(region.getByText("Primeira reflexão sem página.")).toBeVisible();
  await region.getByRole("button", { name: "+ Nova anotação", exact: true }).click(); await dialog.getByLabel("Página").fill("181"); await dialog.getByLabel("Anotação", { exact: true }).fill("Uma reflexão sobre o capítulo final.");
  await dialog.getByRole("button", { name: "Salvar anotação" }).click(); await expect(dialog).toBeVisible();
  expect(await dialog.getByLabel("Página").evaluate((input: HTMLInputElement) => input.validity.rangeOverflow)).toBe(true);
  await dialog.getByLabel("Página").fill("56"); await page.screenshot({ path: "test-results/anotacao-dialog.png", fullPage: true });
  await dialog.getByRole("button", { name: "Salvar anotação" }).click(); await expect(dialog).toHaveCount(0); await expect(region.getByText("Pág. 56", { exact: true })).toBeVisible();
  const note = region.getByRole("listitem").filter({ hasText: "Uma reflexão sobre o capítulo final." });
  await note.getByLabel("Opções da anotação da página 56").click(); await note.getByRole("button", { name: "Editar", exact: true }).click();
  await dialog.getByLabel("Página").fill("57"); await dialog.getByLabel("Anotação", { exact: true }).fill("Minha anotação atualizada."); await dialog.getByRole("button", { name: "Salvar anotação" }).click();
  await expect(dialog).toHaveCount(0); await expect(page.getByRole("status").filter({ hasText: "Anotação atualizada." })).toBeVisible(); await expect(region.getByText("Pág. 57", { exact: true })).toBeVisible();
  await page.reload(); const updated = region.getByRole("listitem").filter({ hasText: "Minha anotação atualizada." }); await expect(updated).toBeVisible();
  await page.screenshot({ path: "test-results/livro-anotacoes.png", fullPage: true });
  await updated.getByLabel("Opções da anotação da página 57").click(); await updated.getByRole("button", { name: "Excluir", exact: true }).click(); await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await updated.getByRole("button", { name: "Excluir", exact: true }).click(); await dialog.getByRole("button", { name: "Confirmar remoção", exact: true }).click();
  await expect(dialog).toHaveCount(0); await expect(page.getByRole("status").filter({ hasText: "Anotação excluída." })).toBeVisible(); await expect(updated).toHaveCount(0); await expect(region.getByText("Primeira reflexão sem página.")).toBeVisible();
  expect(await db.book.count({ where: { id: book.id } })).toBe(1);
});

test("HTTP exige sessão e recusa edição/exclusão de resenha e anotação de outro usuário", async ({ page, request }) => {
  const { book, user } = await login(request, page);
  const foreign = await db.user.create({ data: { name: "Outro leitor", email: `other-${randomUUID()}@test.bookly.local`, passwordHash: "inacessível" } }); users.push(foreign.id);
  const review = await db.review.create({ data: { userId: foreign.id, bookId: book.id, rating: 3, content: "Resenha alheia", isPublic: true } });
  const note = await db.readingNote.create({ data: { userId: foreign.id, bookId: book.id, content: "Nota alheia" } });
  expect((await request.get("/api/reviews")).status()).toBe(401);
  for (const resource of [`/api/reviews/${review.id}`, `/api/notes/${note.id}`]) {
    expect((await page.request.patch(resource, { headers: { Origin: origin }, data: { content: "Tentativa" } })).status()).toBe(404);
    expect((await page.request.delete(resource, { headers: { Origin: origin } })).status()).toBe(404);
  }
  expect((await page.request.post("/api/reviews", { headers: { Origin: origin }, data: { externalId: book.externalId, userId: user.id, rating: 3, content: "Forjada" } })).status()).toBe(400);
  expect((await page.request.post(`/api/books/${book.externalId}/notes`, { headers: { Origin: origin }, data: { page: -1, content: "Inválida" } })).status()).toBe(400);
  expect((await page.request.post("/api/reviews", { headers: { Origin: origin }, data: { externalId: book.externalId, rating: 6, content: "Inválida" } })).status()).toBe(400);
  await page.goto(`/livros/${book.externalId}`); await expect(page.getByText("Resenha alheia", { exact: true })).toHaveCount(0); await expect(page.getByText("Nota alheia", { exact: true })).toHaveCount(0);
});
