import { apiRoute } from "@/lib/api-route";
import { readJson } from "@/lib/http";
import { updateReview, deleteReview } from "@/features/reviews/review.service";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export function PATCH(request: Request, context: Context) {
  return apiRoute(request, async () => Response.json({ data: await updateReview((await context.params).id, await readJson(request, 131072)), message: "Resenha atualizada." }));
}
export function DELETE(request: Request, context: Context) {
  return apiRoute(request, async () => { await deleteReview((await context.params).id); return new Response(null, { status: 204 }); });
}
