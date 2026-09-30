import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { SYSTEM_SHELVES } from "@/features/shelves/system-shelves";
import { googleIdentitySchema, loginSchema, registerSchema } from "./auth.schema";
import { hashPassword, verifyPassword } from "./password";
import { consumeAuthAttempt } from "./rate-limit";

export const publicUserSelect = { id: true, name: true, email: true, avatarUrl: true } as const;
const authenticatedUserSelect = { ...publicUserSelect, sessionVersion: true } as const;

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

export async function authenticateGoogleUser(input: unknown) {
  const data = googleIdentitySchema.parse(input);
  const db = getDb();

  return db.$transaction(async (transaction) => {
    const linked = await transaction.user.findUnique({ where: { googleId: data.googleId }, select: authenticatedUserSelect });
    if (linked) {
      return transaction.user.update({
        where: { id: linked.id },
        data: { avatarUrl: data.avatarUrl ?? linked.avatarUrl },
        select: authenticatedUserSelect,
      });
    }

    const sameEmail = await transaction.user.findUnique({ where: { email: data.email }, select: { ...authenticatedUserSelect, googleId: true } });
    if (sameEmail) {
      if (sameEmail.googleId && sameEmail.googleId !== data.googleId) {
        throw new AppError("GOOGLE_ACCOUNT_CONFLICT", "Este e-mail já está vinculado a outra conta Google.", 409);
      }
      return transaction.user.update({
        where: { id: sameEmail.id },
        data: { googleId: data.googleId, avatarUrl: sameEmail.avatarUrl ?? data.avatarUrl },
        select: authenticatedUserSelect,
      });
    }

    return transaction.user.create({
      data: {
        name: data.name,
        email: data.email,
        googleId: data.googleId,
        avatarUrl: data.avatarUrl,
        passwordHash: null,
        shelves: { create: SYSTEM_SHELVES.map((shelf) => ({ ...shelf })) },
      },
      select: authenticatedUserSelect,
    });
  });
}
