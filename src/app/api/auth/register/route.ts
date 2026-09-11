import { registerUser } from "@/features/auth/auth.service";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await registerUser(await readJson(request));
    return Response.json({ data: user, message: "Conta criada. Entre para continuar." }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
