import { createHash, randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) });
const createdEmails: string[] = [];
const createdBookIds: string[] = [];
const password = "Uma senha de teste 123!";
function email() { const value = `e2e-${randomUUID()}@test.bookly.local`; createdEmails.push(value); return value; }
async function register(request: APIRequestContext, address: string) {
  return request.post("/api/auth/register", { headers: { Origin: "http://127.0.0.1:3001" }, data: { name: "Pedro Leitor", email: address, password, confirmPassword: password } });
}
async function login(page: Page, address: string, pass = password) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(address);
  await page.getByLabel("Senha", { exact: true }).fill(pass);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: createdEmails } } });
  await db.book.deleteMany({ where: { id: { in: createdBookIds } } });
  await db.$disconnect();
});

test("mantém a entrada pública e protege a API sem sessão", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Descubra livros e construa sua história como leitor." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sua biblioteca, do seu jeito" })).toBeVisible();
  expect((await request.get("/api/me")).status()).toBe(401);
});

test("visitante pesquisa e consulta livros, mas não acessa recursos pessoais", async ({ page }) => {
  const book = await db.book.create({
    data: {
      externalId: `guest-${randomUUID()}`,
      title: "Livro público de teste",
      authors: ["Autora Visitante"],
      description: "Descrição pública do catálogo.",
      pageCount: 180,
    },
  });
  createdBookIds.push(book.id);
  await page.route("**/api/books/search**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      data: [{
        externalId: book.externalId,
        title: book.title,
        subtitle: null,
        authors: book.authors,
        description: book.description,
        coverUrl: null,
        categories: [],
        publisher: null,
        publishedDate: null,
        pageCount: book.pageCount,
        language: "pt-BR",
        isbn10: null,
        isbn13: null,
        averageRating: null,
        ratingsCount: null,
      }],
      meta: { total: 1, limit: 24, offset: 0, nextOffset: null },
    }),
  }));

  await page.goto("/explorar?q=Livro público");
  await expect(page.getByRole("heading", { name: "Explorar livros" })).toBeVisible();
  await expect(page.getByRole("link", { name: book.title, exact: true }).last()).toBeVisible();
  await expect(page.getByLabel(`Estante para ${book.title}`)).toBeDisabled();
  await page.getByRole("button", { name: `Adicionar ${book.title} à estante selecionada` }).click();
  await expect(page.getByRole("dialog", { name: "Entre para continuar no Bookly" })).toBeVisible();
  await expect(page.getByText("Este é um recurso exclusivo da sua conta.")).toBeVisible();
  await page.getByRole("button", { name: "Agora não" }).click();
  await page.getByRole("link", { name: book.title, exact: true }).last().click();
  await expect(page).toHaveURL(new RegExp(`/livros/${book.externalId}$`));
  await expect(page.getByRole("heading", { name: book.title, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar à estante" }).click();
  await expect(page.getByRole("dialog", { name: "Entre para continuar no Bookly" })).toBeVisible();
  await page.getByRole("button", { name: "Agora não" }).click();

  await page.getByRole("button", { name: "Minhas Estantes" }).click();
  await expect(page.getByRole("dialog", { name: "Entre para continuar no Bookly" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/livros/${book.externalId}$`));
});

test("cadastro → login → recarregar → logout → rota protegida", async ({ page }) => {
  const address = email();
  await page.goto("/cadastro");
  await page.getByLabel("Nome", { exact: true }).fill("Pedro Leitor");
  await page.getByLabel("E-mail", { exact: true }).fill(address);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel("Confirmar senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?cadastro=sucesso$/);
  await expect(page.getByRole("status")).toContainText("Conta criada");
  const user = await db.user.findUniqueOrThrow({ where: { email: address }, include: { shelves: true } });
  expect(user.shelves).toHaveLength(3);
  expect(user.shelves.every((s) => s.type === "SYSTEM")).toBe(true);
  await login(page, address);
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta, Pedro" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Abrir menu da conta de Pedro Leitor" }).click();
  await expect(page.getByText(address, { exact: true })).toBeVisible();
  const me = await page.request.get("/api/me");
  expect((await me.json()).data.id).toBe(user.id);
  expect(await me.text()).not.toContain("passwordHash");
  const cookie = (await page.context().cookies()).find((c) => c.name.includes("session-token"));
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Descubra livros e construa sua história como leitor." })).toBeVisible();
  expect((await page.request.get("/api/me")).status()).toBe(401);
  expect((await page.context().cookies()).find((c) => c.name.includes("session-token"))).toBeUndefined();
  await page.goto("/estantes");
  await expect(page).toHaveURL(/\/login$/);
});

test("mostra erros em português e recusa e-mail duplicado", async ({ page, request }) => {
  const address = email();
  expect((await register(request, address)).status()).toBe(201);
  const duplicate = await register(request, address.toUpperCase());
  expect(duplicate.status()).toBe(409);
  expect((await duplicate.json()).error.message).toBe("Este e-mail já está cadastrado.");
  await login(page, address, "Senha errada 123!");
  await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("valida confirmação e rejeita cadastro cross-origin e userId forjado", async ({ page, request }) => {
  await page.goto("/cadastro");
  await page.getByLabel("Nome", { exact: true }).fill("Pedro");
  await page.getByLabel("E-mail", { exact: true }).fill(email());
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel("Confirmar senha", { exact: true }).fill("Outra senha 123!");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByText("As senhas não coincidem.")).toBeVisible();
  await expect(page.getByLabel("Confirmar senha", { exact: true })).toBeFocused();
  const data = { name: "Pedro", email: email(), password, confirmPassword: password };
  expect((await request.post("/api/auth/register", { headers: { Origin: "https://outro.example" }, data })).status()).toBe(403);
  expect((await request.post("/api/auth/register", { headers: { Origin: "http://127.0.0.1:3001" }, data: { ...data, userId: randomUUID() } })).status()).toBe(400);
});

test("ignora userId externo e invalida sessão com versão revogada", async ({ page, request }) => {
  const address = email();
  const otherAddress = email();
  await register(request, address);
  const other = (await (await register(request, otherAddress)).json()).data;
  await login(page, address);
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta, Pedro" })).toBeVisible();
  const me = await page.request.get(`/api/me?userId=${other.id}`);
  expect((await me.json()).data.email).toBe(address);
  await db.user.update({ where: { email: address }, data: { sessionVersion: { increment: 1 } } });
  expect((await page.request.get("/api/me")).status()).toBe(401);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Descubra livros e construa sua história como leitor." })).toBeVisible();
});

test("login exige token CSRF e cookie adulterado não autentica", async ({ page, request }) => {
  const address = email();
  await register(request, address);
  await request.post("/api/auth/callback/credentials", { form: { email: address, password, json: "true" } });
  expect((await request.get("/api/me")).status()).toBe(401);
  await page.context().addCookies([{ name: "next-auth.session-token", value: "token-adulterado", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Descubra livros e construa sua história como leitor." })).toBeVisible();
});

test("formulários continuam utilizáveis em tela estreita", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cadastro");
  await expect(page.getByRole("button", { name: "Criar conta", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("solicita link e redefine a senha", async ({ page, request }) => {
  const address = email();
  expect((await register(request, address)).status()).toBe(201);

  await page.goto("/login");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(page).toHaveURL(/\/esqueci-senha$/);
  await page.getByLabel("E-mail", { exact: true }).fill(address);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Se existir uma conta com esse e-mail",
  );

  const user = await db.user.findUniqueOrThrow({ where: { email: address } });
  const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  await db.passwordResetToken.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
    update: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 30 * 60_000),
      usedAt: null,
      createdAt: new Date(),
    },
  });

  const replacement = "Uma senha nova de teste 456!";
  await page.goto(`/redefinir-senha?token=${token}`);
  await page.getByLabel("Nova senha", { exact: true }).fill(replacement);
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill(replacement);
  await page.getByRole("button", { name: "Redefinir senha" }).click();
  await expect(page).toHaveURL(/\/login\?senha=redefinida$/);
  await expect(page.getByRole("status")).toContainText("Senha redefinida");

  await login(page, address, replacement);
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta, Pedro" })).toBeVisible();
});
