import { resetPassword } from "@/features/auth/password-reset.service";
import { apiRoute } from "@/lib/api-route";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return apiRoute(request, async () => {
    await resetPassword(await readJson(request));
    return Response.json({ message: "Senha redefinida. Entre com a nova senha." });
  });
}
