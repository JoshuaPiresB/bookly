import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";
import { registerSchema } from "../src/features/auth/auth.schema";
import { SYSTEM_SHELVES } from "../src/features/shelves/system-shelves";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (process.env.NODE_ENV !== "development" || process.env.ALLOW_DEV_SEED !== "true" || !["localhost", "127.0.0.1", "[::1]", "postgres"].includes(url.hostname) || !["/bookly", "/bookly_dev", "/bookly_test"].includes(url.pathname)) {
    throw new Error("Seed bloqueado. Exige NODE_ENV=development, ALLOW_DEV_SEED=true e banco local bookly, bookly_dev ou bookly_test.");
  }
  const data = registerSchema.parse({ name: "Leitor de demonstração", email: process.env.SEED_EMAIL ?? "demo@bookly.local", password: process.env.SEED_PASSWORD, confirmPassword: process.env.SEED_PASSWORD });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) { console.log("Usuário de desenvolvimento já existe; conta e senha preservadas."); return; }
    const passwordHash = await bcrypt.hash(data.password, 12);
    await prisma.user.create({ data: { name: data.name, email: data.email, passwordHash, shelves: { create: SYSTEM_SHELVES.map((shelf) => ({ ...shelf })) } } });
    console.log("Usuário de desenvolvimento e três estantes padrão criados.");
  } finally { await prisma.$disconnect(); }
}

main().catch(() => { console.error("Não foi possível executar o seed. Confira o ambiente, a habilitação explícita e uma SEED_PASSWORD válida (mínimo 10 caracteres, máximo 72 bytes)."); process.exitCode = 1; });
