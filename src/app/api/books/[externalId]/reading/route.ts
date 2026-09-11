import { apiRoute } from "@/lib/api-route";
import { readJson } from "@/lib/http";
import { getReading, updateReading } from "@/features/reading/reading.service";

export const runtime = "nodejs";
type Context = { params: Promise<{ externalId: string }> };
export function GET(request: Request, context: Context) {
  return apiRoute(request, async () => Response.json({ data: await getReading((await context.params).externalId) }));
}
export function PATCH(request: Request, context: Context) {
  return apiRoute(request, async () => Response.json({ data: await updateReading((await context.params).externalId, await readJson(request)), message: "Leitura atualizada." }));
}
