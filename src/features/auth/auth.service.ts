import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { SYSTEM_SHELVES } from "@/features/shelves/system-shelves";
import { loginSchema, registerSchema } from "./auth.schema";
import { hashPassword, verifyPassword } from "./password";
import { consumeAuthAttempt } from "./rate-limit";

export const publicUserSelect = { id: true, name: true, email: true, avatarUrl: true } as const;

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);
  await consumeAuthAttempt("register", data.email);
  const passwordHash = await hashPassword(data.password);
  try {
    // Nested write: usuário e estantes são confirmados/revertidos juntos.
    return await getDb().user.create({
      data: { name: data.name, email: data.email, passwordHash, shelves: { create: SYSTEM_SHELVES.map((shelf) => ({ ...shelf })) } },
      select: publicUserSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("EMAIL_IN_USE", "Este e-mail já está cadastrado.", 409);
    }
    throw error;
  }
}

export async function authenticateUser(input: unknown) {
  const result = loginSchema.safeParse(input);
  if (!result.success) return null;
  await consumeAuthAttempt("login", result.data.email);
  const user = await getDb().user.findUnique({ where: { email: result.data.email } });
  const matches = await verifyPassword(result.data.password, user?.passwordHash);
  if (!user || !matches) return null;
  return { id: user.id, name: user.name, email: user.email, image: user.avatarUrl, sessionVersion: user.sessionVersion };
}
