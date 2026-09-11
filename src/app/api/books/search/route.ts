import { searchBooks } from "@/features/books/book.service";
import { apiRoute, pageResponse, queryParams } from "@/lib/api-route";

export const runtime = "nodejs";
export function GET(request: Request) {
  return apiRoute(request, async () => pageResponse(await searchBooks(queryParams(request))));
}
