import { getBookDetails } from "@/features/books/book.service";
import { apiRoute } from "@/lib/api-route";

export const runtime = "nodejs";
export function GET(request: Request, context: { params: Promise<{ externalId: string }> }) {
  return apiRoute(request, async () => Response.json({ data: await getBookDetails((await context.params).externalId) }));
}
