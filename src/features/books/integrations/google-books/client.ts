import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { bookSearchSchema, externalIdSchema, type BookSearchInput } from "@/features/books/book.schema";
import type { BookSearchPage } from "@/features/books/book.types";
import { invalidGoogleResponse, normalizeGoogleVolume } from "./normalizer";
import { normalizeLegacyGoogleDetail, normalizeLegacyGoogleSearch } from "./legacy";

export const GOOGLE_BOOKS_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const BASE_URL = "https://books.googleapis.com/books/v1/volumes";
const LEGACY_BASE_URL = "https://books.google.com/books/feeds/volumes";
const searchResponseSchema = z.object({ totalItems: z.number().int().nonnegative(), items: z.array(z.unknown()).max(40).optional() });

export function buildGoogleQuery(input: BookSearchInput) {
  const isbn = input.q.replace(/[\s-]/g, "").toUpperCase();
  const isIsbn = /^(\d{9}[\dX]|\d{13})$/.test(isbn);
  if (input.mode === "isbn" && !isIsbn) throw new AppError("INVALID_ISBN", "Informe um ISBN de 10 ou 13 caracteres válido.");
  if (input.mode === "isbn" || (input.mode === "all" && isIsbn)) return `isbn:${isbn}`;
  if (input.mode === "title" || input.mode === "author") {
    const term = input.q.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
    if (!term) throw new AppError("INVALID_QUERY", "Informe um título ou autor válido.");
    return `${input.mode === "title" ? "intitle" : "inauthor"}:"${term}"`;
  }
  return input.q;
}

async function requestGoogle(url: URL, key?: string): Promise<unknown> {
  if (key) url.searchParams.set("key", key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_BOOKS_TIMEOUT_MS);
  try {
    // URL fixa, sem cookies/sessão, sem redirecionamentos ou cache de dados privados.
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" }, redirect: "error", cache: "no-store" });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 404) throw new AppError("BOOK_NOT_FOUND", "Livro não encontrado.", 404);
      if (response.status === 429 || response.status === 403) throw new AppError("BOOK_PROVIDER_LIMITED", "A consulta de livros está temporariamente indisponível por limite de acesso. Tente novamente mais tarde.", 503);
      throw new AppError("BOOK_PROVIDER_UNAVAILABLE", "Não foi possível consultar o serviço de livros. Tente novamente.", 502);
    }
    const reader = response.body?.getReader();
    if (!reader) throw invalidGoogleResponse();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw invalidGoogleResponse(); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
    catch { throw invalidGoogleResponse(); }
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (controller.signal.aborted) throw new AppError("BOOK_PROVIDER_TIMEOUT", "A consulta de livros demorou demais. Tente novamente.", 504);
    // Não propagar URL, API key ou conteúdo da resposta upstream.
    throw new AppError("BOOK_PROVIDER_UNAVAILABLE", "Não foi possível conectar ao serviço de livros. Tente novamente.", 502);
  } finally { clearTimeout(timer); }
}

export async function searchGoogleBooks(input: unknown): Promise<BookSearchPage> {
  const query = bookSearchSchema.parse(input);
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (!key) {
    const url = new URL(LEGACY_BASE_URL);
    url.searchParams.set("q", buildGoogleQuery(query));
    url.searchParams.set("max-results", String(query.limit));
    url.searchParams.set("start-index", String(query.offset + 1));
    url.searchParams.set("alt", "json");
    return normalizeLegacyGoogleSearch(await requestGoogle(url), query);
  }
  const url = new URL(BASE_URL);
  url.searchParams.set("q", buildGoogleQuery(query));
  url.searchParams.set("maxResults", String(query.limit));
  url.searchParams.set("startIndex", String(query.offset));
  url.searchParams.set("printType", "books");
  const parsed = searchResponseSchema.safeParse(await requestGoogle(url, key));
  if (!parsed.success) throw invalidGoogleResponse();
  const rawItems = parsed.data.items ?? [];
  const unique = new Map<string, ReturnType<typeof normalizeGoogleVolume>>();
  for (const raw of rawItems) {
    try { const book = normalizeGoogleVolume(raw); unique.set(book.externalId, book); }
    catch (error) { if (!(error instanceof AppError)) throw error; }
  }
  if (rawItems.length && !unique.size) throw invalidGoogleResponse();
  const next = query.offset + rawItems.length;
  return { items: [...unique.values()].slice(0, query.limit), total: parsed.data.totalItems, limit: query.limit, offset: query.offset,
    nextOffset: rawItems.length >= query.limit && next < parsed.data.totalItems && next <= 10000 ? next : null };
}

export async function getGoogleBook(externalId: string) {
  const id = externalIdSchema.parse(externalId);
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  const book = key
    ? normalizeGoogleVolume(await requestGoogle(new URL(`${BASE_URL}/${encodeURIComponent(id)}`), key))
    : normalizeLegacyGoogleDetail(await requestGoogle(new URL(`${LEGACY_BASE_URL}/${encodeURIComponent(id)}?alt=json`)));
  if (book.externalId !== id) throw invalidGoogleResponse();
  return book;
}
