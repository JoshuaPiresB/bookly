import { createShelf, listShelves } from "@/features/shelves/shelf.service";
import { apiRoute, pageResponse, queryParams } from "@/lib/api-route";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";
export function GET(request: Request) {
  return apiRoute(request, async () => pageResponse(await listShelves(queryParams(request))));
}
export function POST(request: Request) {
  return apiRoute(request, async () => Response.json({ data: await createShelf(await readJson(request)), message: "Estante criada." }, { status: 201 }));
}
