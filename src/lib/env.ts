import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(10).optional(),
);
const optionalOAuthCredential = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().trim().min(10).optional(),
);
const optionalMailFrom = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().trim().min(3).max(320).refine((value) => !/[\r\n]/.test(value), "RESEND_FROM inválido.").optional(),
);
const resetTtl = z.preprocess(
  (value) => value === "" || value === undefined ? 30 : value,
  z.coerce.number().int().min(10).max(120),
);

const schema = z.object({
  DATABASE_URL: z.url("DATABASE_URL deve ser uma URL PostgreSQL válida.")
    .refine((value) => /^postgres(ql)?:\/\//.test(value), "Use PostgreSQL em DATABASE_URL."),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET deve ter pelo menos 32 caracteres."),
  NEXTAUTH_URL: z.url("NEXTAUTH_URL inválida."),
  GOOGLE_CLIENT_ID: optionalOAuthCredential,
  GOOGLE_CLIENT_SECRET: optionalOAuthCredential,
  RESEND_API_KEY: optionalSecret,
  RESEND_FROM: optionalMailFrom,
  PASSWORD_RESET_TTL_MINUTES: resetTtl,
}).superRefine((env, context) => {
  if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
    context.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_ID"], message: "Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET juntos." });
  }
});

export function getServerEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // Somente nomes das variáveis; nunca imprimir os valores/segredos.
    throw new Error(`Configuração do servidor inválida: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}. Consulte .env.example.`);
  }
  return result.data;
}
