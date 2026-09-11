import { requireApiUser } from "@/lib/current-user";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ data: await requireApiUser() }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return errorResponse(error); }
}
