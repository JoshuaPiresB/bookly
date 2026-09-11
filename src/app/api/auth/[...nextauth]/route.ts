import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { getAuthOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  try { return await NextAuth(getAuthOptions())(request, context) as Response; }
  catch (error) { return errorResponse(error); }
}
export { handler as GET, handler as POST };
