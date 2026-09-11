import "server-only";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fieldErrors[key] ??= []).push(issue.code === "unrecognized_keys" ? "Há campos não permitidos na requisição." : issue.message);
    }
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Confira os campos informados.", fieldErrors } }, { status: 400 });
  }
  if (error instanceof AppError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  // Não incluir a mensagem da exceção: drivers podem incorporar credenciais/SQL.
  console.error("[Bookly] Falha interna na operação:", error instanceof Error ? error.name : "UnknownError");
  return Response.json({ error: { code: "SERVICE_UNAVAILABLE", message: "Não foi possível concluir agora. Tente novamente em instantes." } }, { status: 503 });
}

export async function readJson(request: Request, maxBytes = 8192): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new AppError("INVALID_CONTENT_TYPE", "Envie os dados no formato JSON.", 415);
  }
  // Limite também durante a leitura, para não confiar em Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_BODY", "Informe os dados do formulário.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AppError("BODY_TOO_LARGE", "Os dados enviados são muito grandes.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("INVALID_JSON", "Os dados enviados são inválidos.");
  } finally { reader.releaseLock(); }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(getServerEnv().NEXTAUTH_URL).origin) {
    throw new AppError("INVALID_ORIGIN", "Origem da requisição não permitida.", 403);
  }
}
