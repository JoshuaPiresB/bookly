import { apiRoute } from "@/lib/api-route";
import { readJson } from "@/lib/http";
import { updateNote, deleteNote } from "@/features/notes/note.service";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export function PATCH(request: Request, context: Context) {
  return apiRoute(request, async () => Response.json({ data: await updateNote((await context.params).id, await readJson(request, 131072)), message: "Anotação atualizada." }));
}
export function DELETE(request: Request, context: Context) {
  return apiRoute(request, async () => { await deleteNote((await context.params).id); return new Response(null, { status: 204 }); });
}
