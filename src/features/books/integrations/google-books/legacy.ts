import { z } from "zod";
import { AppError } from "@/lib/errors";
import { externalIdSchema, type BookSearchInput } from "@/features/books/book.schema";
import type { BookSearchPage, BookSearchResult } from "@/features/books/book.types";
import { invalidGoogleResponse, normalizeGoogleVolume } from "./normalizer";

const taggedValueSchema = z.object({ $t: z.unknown().optional() });
const legacyEntrySchema = z.object({
  id: taggedValueSchema,
  title: taggedValueSchema.optional(),
  "dc$title": z.array(taggedValueSchema).optional(),
  "dc$creator": z.array(taggedValueSchema).optional(),
  "dc$description": z.array(taggedValueSchema).optional(),
  "dc$subject": z.array(taggedValueSchema).optional(),
  "dc$publisher": z.array(taggedValueSchema).optional(),
  "dc$date": z.array(taggedValueSchema).optional(),
  "dc$format": z.array(taggedValueSchema).optional(),
  "dc$language": z.array(taggedValueSchema).optional(),
  "dc$identifier": z.array(taggedValueSchema).optional(),
  link: z.array(z.object({ rel: z.string(), href: z.string() })).optional(),
});
const legacySearchSchema = z.object({
  feed: z.object({
    "openSearch$totalResults": taggedValueSchema,
    entry: z.array(z.unknown()).max(40).optional(),
  }),
});
const legacyDetailSchema = z.object({ entry: z.unknown() });

function taggedText(value: { $t?: unknown } | undefined) {
  return typeof value?.$t === "string" ? value.$t : undefined;
}

function taggedTexts(values: Array<{ $t?: unknown }> | undefined) {
  return values?.map(taggedText).filter((value): value is string => Boolean(value)) ?? [];
}

function legacyExternalId(value: unknown) {
  if (typeof value !== "string") throw invalidGoogleResponse();
  try {
    const url = new URL(value);
    const id = url.pathname.split("/").filter(Boolean).at(-1);
    return externalIdSchema.parse(id);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalidGoogleResponse();
  }
}

function legacyPageCount(formats: string[]) {
  for (const format of formats) {
    const match = /^(\d+)\s+pages?$/i.exec(format.trim());
    if (match) return Number(match[1]);
  }
  return undefined;
}

function legacyIdentifiers(values: string[]) {
  const identifiers: Array<{ type: string; identifier: string }> = [];
  for (const value of values) {
    const candidate = value.replace(/^ISBN:/i, "").replace(/[\s-]/g, "").toUpperCase();
    if (/^\d{13}$/.test(candidate)) identifiers.push({ type: "ISBN_13", identifier: candidate });
    else if (/^\d{9}[\dX]$/.test(candidate)) identifiers.push({ type: "ISBN_10", identifier: candidate });
  }
  return identifiers;
}

/** Converte o feed JSON oficial legado do Google para o mesmo contrato da API v1. */
export function normalizeLegacyGoogleVolume(input: unknown): BookSearchResult {
  const parsed = legacyEntrySchema.safeParse(input);
  if (!parsed.success) throw invalidGoogleResponse();
  const entry = parsed.data;
  const externalId = legacyExternalId(taggedText(entry.id));
  const links = entry.link ?? [];
  const thumbnail = links.find((link) => link.rel === "http://schemas.google.com/books/2008/thumbnail")?.href;
  const title = taggedText(entry.title) ?? taggedTexts(entry["dc$title"])[0];
  return normalizeGoogleVolume({
    id: externalId,
    volumeInfo: {
      title,
      authors: taggedTexts(entry["dc$creator"]),
      description: taggedTexts(entry["dc$description"])[0],
      categories: taggedTexts(entry["dc$subject"]),
      publisher: taggedTexts(entry["dc$publisher"])[0],
      publishedDate: taggedTexts(entry["dc$date"])[0],
      pageCount: legacyPageCount(taggedTexts(entry["dc$format"])),
      language: taggedTexts(entry["dc$language"])[0],
      industryIdentifiers: legacyIdentifiers(taggedTexts(entry["dc$identifier"])),
      imageLinks: thumbnail ? { thumbnail } : undefined,
    },
  });
}

function totalResults(value: unknown) {
  const text = taggedText(value as { $t?: unknown });
  const total = text === undefined ? Number.NaN : Number(text);
  if (!Number.isSafeInteger(total) || total < 0) throw invalidGoogleResponse();
  return total;
}

export function normalizeLegacyGoogleSearch(input: unknown, query: BookSearchInput): BookSearchPage {
  const parsed = legacySearchSchema.safeParse(input);
  if (!parsed.success) throw invalidGoogleResponse();
  const rawItems = parsed.data.feed.entry ?? [];
  const unique = new Map<string, BookSearchResult>();
  for (const raw of rawItems) {
    try {
      const book = normalizeLegacyGoogleVolume(raw);
      unique.set(book.externalId, book);
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
    }
  }
  if (rawItems.length && !unique.size) throw invalidGoogleResponse();
  const total = totalResults(parsed.data.feed["openSearch$totalResults"]);
  const next = query.offset + rawItems.length;
  return {
    items: [...unique.values()].slice(0, query.limit),
    total,
    limit: query.limit,
    offset: query.offset,
    nextOffset: rawItems.length >= query.limit && next < total && next <= 10000 ? next : null,
  };
}

export function normalizeLegacyGoogleDetail(input: unknown) {
  const parsed = legacyDetailSchema.safeParse(input);
  if (!parsed.success) throw invalidGoogleResponse();
  return normalizeLegacyGoogleVolume(parsed.data.entry);
}
