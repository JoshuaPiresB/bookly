import { removeBookFromShelf } from "@/features/shelves/shelf-book.service";
import { apiRoute } from "@/lib/api-route";

export const runtime = "nodejs";
export function DELETE(request: Request, context: { params: Promise<{ id: string; bookId: string }> }) {
  return apiRoute(request, async () => {
    const { id, bookId } = await context.params;
    await removeBookFromShelf(id, bookId);
    return new Response(null, { status: 204 });
  });
}
