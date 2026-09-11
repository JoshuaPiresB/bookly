import { addBookToShelf, listShelfBooks } from "@/features/shelves/shelf-book.service";
import { apiRoute, pageResponse, queryParams } from "@/lib/api-route";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export function GET(request: Request, context: Context) {
  return apiRoute(request, async () => pageResponse(await listShelfBooks((await context.params).id, queryParams(request))));
}
export function POST(request: Request, context: Context) {
  return apiRoute(request, async () => {
    const result = await addBookToShelf((await context.params).id, await readJson(request));
    return Response.json({ data: result, message: result.added ? "Livro adicionado à estante." : "O livro já está nesta estante." }, { status: result.added ? 201 : 200 });
  });
}
