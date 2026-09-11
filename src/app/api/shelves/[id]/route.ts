import { deleteShelf, getShelf, updateShelf } from "@/features/shelves/shelf.service";
import { apiRoute } from "@/lib/api-route";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export function GET(request: Request, context: Context) {
  return apiRoute(request, async () => Response.json({ data: await getShelf((await context.params).id) }));
}
export function PATCH(request: Request, context: Context) {
  return apiRoute(request, async () => Response.json({ data: await updateShelf((await context.params).id, await readJson(request)), message: "Estante atualizada." }));
}
export function DELETE(request: Request, context: Context) {
  return apiRoute(request, async () => { await deleteShelf((await context.params).id); return new Response(null, { status: 204 }); });
}
