/** Contrato do Bookly, independente do formato de qualquer provedor. */
export type BookSearchResult = {
  externalId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string | null;
  coverUrl: string | null;
  categories: string[];
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  language: string | null;
  isbn10: string | null;
  isbn13: string | null;
  averageRating: number | null;
  ratingsCount: number | null;
};

export type BookSearchPage = {
  items: BookSearchResult[];
  total: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
};
