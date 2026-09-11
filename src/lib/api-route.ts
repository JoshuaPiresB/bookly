import "server-only";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, errorResponse } from "@/lib/http";

/** Adaptação HTTP somente; autenticação e autorização pertencem aos services. */
export async function apiRoute(request: Request, operation: () => Promise<Response>) {
  try {
    if (!["GET", "HEAD"].includes(request.method)) assertSameOrigin(request);
    const response = await operation();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const response = errorResponse(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}

export function queryParams(request: Request) {
  const params = new URL(request.url).searchParams;
  for (const key of params.keys()) {
    if (params.getAll(key).length > 1) throw new AppError("INVALID_QUERY", "Não repita parâmetros na consulta.");
  }
  return Object.fromEntries(params);
}

export function pageResponse<T>(page: { items: T[]; total: number; limit: number; offset: number; nextOffset?: number | null }) {
  const { items, ...meta } = page;
  return Response.json({ data: items, meta });
}
