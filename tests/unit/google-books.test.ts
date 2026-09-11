import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeGoogleVolume } from "@/features/books/integrations/google-books/normalizer";
import { buildGoogleQuery, getGoogleBook, GOOGLE_BOOKS_TIMEOUT_MS, searchGoogleBooks } from "@/features/books/integrations/google-books/client";
import { bookSearchSchema } from "@/features/books/book.schema";
import { normalizeLegacyGoogleVolume } from "@/features/books/integrations/google-books/legacy";

const volume = {
  id: "hobbit-test", kind: "books#volume", accessInfo: { secret: "not-an-internal-field" },
  volumeInfo: { title: " O Hobbit ", subtitle: " Uma aventura ", authors: [" Tolkien ", "Tolkien", 123],
    description: "<p>Uma aventura &amp; reflexão.</p><script>alert(1)</script>", categories: ["Fantasia"],
    imageLinks: { thumbnail: "http://books.google.com/books?id=hobbit-test&img=1" },
    publisher: "Editora", publishedDate: "1937", pageCount: 320, language: "pt", averageRating: 4.5, ratingsCount: 12,
    industryIdentifiers: [{ type: "ISBN_10", identifier: "0-261-10221-4" }, { type: "ISBN_13", identifier: "978-0261102217" }],
  },
};

const legacyEntry = {
  id: { $t: "http://www.google.com/books/feeds/volumes/hobbit-test" },
  title: { $t: " O Hobbit " },
  "dc$creator": [{ $t: " Tolkien " }],
  "dc$description": [{ $t: "<p>Uma aventura &amp; reflexão.</p>" }],
  "dc$subject": [{ $t: "Fantasia" }],
  "dc$publisher": [{ $t: "Editora" }],
  "dc$date": [{ $t: "1937" }],
  "dc$format": [{ $t: "320 pages" }, { $t: "book" }],
  "dc$language": [{ $t: "pt" }],
  "dc$identifier": [{ $t: "hobbit-test" }, { $t: "ISBN:978-0261102217" }, { $t: "ISBN:0-261-10221-4" }],
  link: [{ rel: "http://schemas.google.com/books/2008/thumbnail", href: "http://books.google.com/books?id=hobbit-test&img=1" }],
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("normalização Google Books", () => {
  it("gera o contrato interno completo sem os campos brutos do Google", () => {
    expect(normalizeGoogleVolume(volume)).toEqual({ externalId: "hobbit-test", title: "O Hobbit", subtitle: "Uma aventura", authors: ["Tolkien"],
      description: "Uma aventura & reflexão.", categories: ["Fantasia"], coverUrl: "https://books.google.com/books?id=hobbit-test&img=1",
      publisher: "Editora", publishedDate: "1937", pageCount: 320, language: "pt", averageRating: 4.5, ratingsCount: 12, isbn10: "0261102214", isbn13: "9780261102217" });
  });
  it("tolera metadados opcionais ausentes ou inválidos", () => {
    expect(normalizeGoogleVolume({ id: "minimal", volumeInfo: { pageCount: -1, averageRating: 8, ratingsCount: 2.5, authors: null } })).toMatchObject({
      title: "Título não informado", authors: [], categories: [], pageCount: null, averageRating: null, ratingsCount: null, coverUrl: null, isbn13: null,
    });
  });
  it("normaliza o feed público do Google para o mesmo contrato interno", () => {
    expect(normalizeLegacyGoogleVolume(legacyEntry)).toMatchObject({
      externalId: "hobbit-test", title: "O Hobbit", authors: ["Tolkien"], description: "Uma aventura & reflexão.",
      categories: ["Fantasia"], publisher: "Editora", publishedDate: "1937", pageCount: 320, language: "pt",
      isbn10: "0261102214", isbn13: "9780261102217", coverUrl: "https://books.google.com/books?id=hobbit-test&img=1",
    });
  });
  it("recusa identificador/estrutura inválidos sem divulgar o payload", () => {
    for (const input of [null, { id: "../etc", volumeInfo: {} }, { id: "valid" }]) expect(() => normalizeGoogleVolume(input)).toThrow("O serviço de livros retornou dados inválidos.");
  });
  it.each(["javascript:alert(1)", "https://attacker.example/cover", "https://books.google.com.attacker.example/cover", "https://user:password@books.google.com/cover"])("ignora capa não permitida: %s", (url) => {
    expect(normalizeGoogleVolume({ id: "image-test", volumeInfo: { imageLinks: { thumbnail: url } } }).coverUrl).toBeNull();
  });
});

describe("pesquisa e transporte Google Books", () => {
  it.each([
    [{ q: "O Hobbit", mode: "title" }, 'intitle:"O Hobbit"'],
    [{ q: "J. R. R. Tolkien", mode: "author" }, 'inauthor:"J. R. R. Tolkien"'],
    [{ q: "978-0261102217" }, "isbn:9780261102217"],
    [{ q: "0-261-10221-4", mode: "isbn" }, "isbn:0261102214"],
    [{ q: "O Hobbit" }, "O Hobbit"],
  ])("constrói consulta para %j", (input, expected) => {
    expect(buildGoogleQuery(bookSearchSchema.parse(input))).toBe(expected);
  });
  it.each([{ q: " " }, { q: "x" }, { q: "a".repeat(201) }, { q: "Hobbit", limit: 41 }, { q: "Hobbit", limit: 0 }, { q: "Hobbit", offset: -1 }, { q: "Hobbit", offset: "abc" }, { q: "Hobbit", mode: "invalid" }])("valida consulta antes de HTTP: %j", async (input) => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(searchGoogleBooks(input)).rejects.toThrow(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejeita ISBN malformado sem consultar o provedor", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(searchGoogleBooks({ q: "não é isbn", mode: "isbn" })).rejects.toMatchObject({ code: "INVALID_ISBN" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("envia limite/paginação/chave no servidor e retorna objetos normalizados", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key-never-public");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ totalItems: 2, items: [volume] })); vi.stubGlobal("fetch", fetchMock);
    const result = await searchGoogleBooks({ q: "O Hobbit", limit: 1 });
    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.origin).toBe("https://books.googleapis.com");
    expect(url.searchParams.get("key")).toBe("test-key-never-public");
    expect(url.searchParams.get("maxResults")).toBe("1");
    expect(url.searchParams.get("startIndex")).toBe("0");
    expect(result).toMatchObject({ total: 2, limit: 1, offset: 0, nextOffset: 1 });
    expect(result.items[0]).not.toHaveProperty("volumeInfo");
    expect(JSON.stringify(result)).not.toContain("test-key-never-public");
  });
  it("pesquisa sem chave e trata resultado vazio", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ feed: { "openSearch$totalResults": { $t: "0" } } })); vi.stubGlobal("fetch", fetchMock);
    expect(await searchGoogleBooks({ q: "nada encontrado" })).toMatchObject({ items: [], total: 0, nextOffset: null });
    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.origin).toBe("https://books.google.com");
    expect(url.searchParams.has("key")).toBe(false);
    expect(url.searchParams.get("start-index")).toBe("1");
  });
  it("pesquisa no feed público e preserva paginação e normalização", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      feed: { "openSearch$totalResults": { $t: "2" }, entry: [legacyEntry] },
    })));
    const result = await searchGoogleBooks({ q: "O Hobbit", limit: 1, offset: 0 });
    expect(result).toMatchObject({ total: 2, limit: 1, offset: 0, nextOffset: 1 });
    expect(result.items[0]).toMatchObject({ externalId: "hobbit-test", title: "O Hobbit" });
  });
  it("deduplica e ignora item inválido sem perder os válidos", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key-never-public");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ totalItems: 3, items: [volume, volume, {}] })));
    expect((await searchGoogleBooks({ q: "Hobbit" })).items).toHaveLength(1);
  });
  it.each([[404, "BOOK_NOT_FOUND"], [429, "BOOK_PROVIDER_LIMITED"], [403, "BOOK_PROVIDER_LIMITED"], [500, "BOOK_PROVIDER_UNAVAILABLE"]])("mapeia HTTP %s sem vazar erro upstream", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private upstream data", { status: Number(status) })));
    await expect(getGoogleBook("missing")).rejects.toMatchObject({ code });
  });
  it.each(["not-json", JSON.stringify({ unexpected: true }), JSON.stringify({ totalItems: 1, items: [{}] })])("trata resposta inválida", async (payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(payload)));
    await expect(searchGoogleBooks({ q: "Hobbit" })).rejects.toMatchObject({ code: "BOOK_PROVIDER_INVALID_RESPONSE" });
  });
  it("limita o corpo da resposta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x".repeat(2 * 1024 * 1024 + 1))));
    await expect(getGoogleBook("large")).rejects.toMatchObject({ code: "BOOK_PROVIDER_INVALID_RESPONSE" });
  });
  it("trata falha de rede sem revelar a chave na URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("https://example?key=private")));
    await expect(getGoogleBook("network")).rejects.toMatchObject({ code: "BOOK_PROVIDER_UNAVAILABLE" });
  });
  it("aplica timeout à conexão", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: URL, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const assertion = expect(getGoogleBook("slow")).rejects.toMatchObject({ code: "BOOK_PROVIDER_TIMEOUT", status: 504 });
    await vi.advanceTimersByTimeAsync(GOOGLE_BOOKS_TIMEOUT_MS);
    await assertion;
  });
  it("timeout também cobre leitura do corpo", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_url: URL, options: RequestInit) => new Response(new ReadableStream({
      start(controller) { options.signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError"))); },
    }))));
    const assertion = expect(getGoogleBook("slow-body")).rejects.toMatchObject({ code: "BOOK_PROVIDER_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(GOOGLE_BOOKS_TIMEOUT_MS);
    await assertion;
  });
  it("obtém detalhe e rejeita resposta referente a outro volume", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-key-never-public");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(volume)).mockResolvedValueOnce(Response.json(volume)));
    expect((await getGoogleBook("hobbit-test")).title).toBe("O Hobbit");
    await expect(getGoogleBook("other-book")).rejects.toMatchObject({ code: "BOOK_PROVIDER_INVALID_RESPONSE" });
  });
  it("obtém detalhes pelo feed público quando não há chave", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ entry: legacyEntry })));
    expect(await getGoogleBook("hobbit-test")).toMatchObject({ externalId: "hobbit-test", title: "O Hobbit", pageCount: 320 });
  });
});
