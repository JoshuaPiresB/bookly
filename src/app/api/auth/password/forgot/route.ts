import {
  PASSWORD_RESET_REQUEST_MESSAGE,
  requestPasswordReset,
} from "@/features/auth/password-reset.service";
import { apiRoute } from "@/lib/api-route";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return apiRoute(request, async () => {
    await requestPasswordReset(await readJson(request));
    return Response.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
  });
}
