import { z } from "zod";
import type { BookSearchResult } from "@/features/books/book.types";
import { externalIdSchema } from "@/features/books/book.schema";
import { AppError } from "@/lib/errors";

const volumeSchema = z.object({
  id: externalIdSchema,
  volumeInfo: z.object({
    title: z.unknown().optional(), subtitle: z.unknown().optional(), authors: z.unknown().optional(),
    description: z.unknown().optional(), categories: z.unknown().optional(), publisher: z.unknown().optional(),
    publishedDate: z.unknown().optional(), pageCount: z.unknown().optional(), language: z.unknown().optional(),
    averageRating: z.unknown().optional(), ratingsCount: z.unknown().optional(),
    industryIdentifiers: z.array(z.object({ type: z.string(), identifier: z.string() })).catch([]).optional(),
    imageLinks: z.record(z.string(), z.unknown()).catch({}).optional(),
  }),
});

export function invalidGoogleResponse() {
  return new AppError("BOOK_PROVIDER_INVALID_RESPONSE", "O serviço de livros retornou dados inválidos. Tente novamente.", 502);
}

function text(value: unknown, maxLength = 100000): string | null {
  if (typeof value !== "string") return null;
  return value.normalize("NFC").replace(/\u0000/g, "").trim().slice(0, maxLength) || null;
}

function texts(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.map((entry: unknown) => text(entry, 500)).filter((entry): entry is string => Boolean(entry)))].slice(0, 100) : [];
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647 ? value : null;
}

/** Produz texto, não HTML confiável. A UI deve renderizar esta string como texto. */
function description(value: unknown): string | null {
  const input = text(value);
  if (!input) return null;
  const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—", hellip: "…" };
  return input.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]*>/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? match;
      const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "";
    }).replace(/\s+/g, " ").trim() || null;
}

function cover(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    if (url.hostname !== "books.google.com" && url.hostname !== "books.googleusercontent.com" && !url.hostname.endsWith(".googleusercontent.com")) return null;
    url.protocol = "https:";
    return url.toString();
  } catch { return null; }
}

export function normalizeGoogleVolume(input: unknown): BookSearchResult {
  const parsed = volumeSchema.safeParse(input);
  if (!parsed.success) throw invalidGoogleResponse();
  const { id, volumeInfo: info } = parsed.data;
  function isbn(type: string, pattern: RegExp) {
    const value = info.industryIdentifiers?.find((item) => item.type === type)?.identifier.replace(/[\s-]/g, "").toUpperCase();
    return value && pattern.test(value) ? value : null;
  }
  const links = info.imageLinks ?? {};
  return {
    externalId: id, title: text(info.title, 1000) ?? "Título não informado", subtitle: text(info.subtitle, 1000),
    authors: texts(info.authors), description: description(info.description), categories: texts(info.categories),
    coverUrl: [links.thumbnail, links.smallThumbnail, links.small, links.medium].map(cover).find(Boolean) ?? null,
    publisher: text(info.publisher, 1000), publishedDate: text(info.publishedDate, 32),
    pageCount: integer(info.pageCount), language: text(info.language, 32),
    isbn10: isbn("ISBN_10", /^\d{9}[\dX]$/), isbn13: isbn("ISBN_13", /^\d{13}$/),
    averageRating: typeof info.averageRating === "number" && Number.isFinite(info.averageRating) && info.averageRating >= 0 && info.averageRating <= 5 ? info.averageRating : null,
    ratingsCount: integer(info.ratingsCount),
  };
}
