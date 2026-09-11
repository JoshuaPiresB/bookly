import { apiRoute } from "@/lib/api-route";
import { readJson } from "@/lib/http";
import { createNote, listNotes } from "@/features/notes/note.service";
export const runtime = "nodejs";
type Context = { params: Promise<{ externalId: string }> };
export function GET(request: Request, context: Context) {
  return apiRoute(request, async () => Response.json({ data: await listNotes((await context.params).externalId) }));
}
export function POST(request: Request, context: Context) {
  return apiRoute(request, async () => Response.json({ data: await createNote((await context.params).externalId, await readJson(request, 131072)), message: "Anotação adicionada." }, { status: 201 }));
}
