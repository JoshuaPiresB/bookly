import { apiRoute } from "@/lib/api-route";
import { readJson } from "@/lib/http";
import { createReview, listReviews } from "@/features/reviews/review.service";
export const runtime = "nodejs";
export function GET(request: Request) {
  return apiRoute(request, async () => Response.json({ data: await listReviews() }));
}
export function POST(request: Request) {
  return apiRoute(request, async () => Response.json({ data: await createReview(await readJson(request, 131072)), message: "Resenha salva." }, { status: 201 }));
}
