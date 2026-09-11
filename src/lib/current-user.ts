import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getAuthOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { publicUserSelect } from "@/features/auth/auth.service";
import { AppError } from "@/lib/errors";

// React cache é limitado à requisição; nenhum dado pessoal usa cache global.
export const getCurrentUser = cache(async () => {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) return null;
  return getDb().user.findUnique({ where: { id: session.user.id }, select: publicUserSelect });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Entre na sua conta para continuar.", 401);
  return user;
}
