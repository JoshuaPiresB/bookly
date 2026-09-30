import { z } from "zod";

export const emailSchema = z.string("Informe seu e-mail.").trim().toLowerCase()
  .max(254, "O e-mail é muito longo.").pipe(z.email("Informe um e-mail válido."));

export const passwordSchema = z.string("Informe sua senha.")
  .min(10, "A senha deve ter pelo menos 10 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "A senha deve ter no máximo 72 bytes. Use menos caracteres especiais.")
  .refine((value) => value.trim().length > 0, "A senha não pode conter apenas espaços.");

export const registerSchema = z.object({
  name: z.string("Informe seu nome.").trim().min(1, "Informe seu nome.").max(80, "O nome deve ter no máximo 80 caracteres."),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string("Confirme sua senha."),
}, { error: "O formulário contém campos inválidos ou não permitidos." }).strict().refine((input) => input.password === input.confirmPassword, {
  path: ["confirmPassword"], message: "As senhas não coincidem.",
});

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
export const googleIdentitySchema = z.object({
  googleId: z.string().trim().min(1).max(255),
  email: emailSchema,
  name: z.string().trim().min(1).max(80),
  avatarUrl: z.url().max(2048).nullable().optional(),
}).strict();
export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
export const resetTokenSchema = z.string("Link de redefinição inválido.")
  .regex(/^[0-9a-f]{64}$/i, "Link de redefinição inválido.");
export const resetPasswordSchema = z.object({
  token: resetTokenSchema,
  password: passwordSchema,
  confirmPassword: z.string("Confirme sua nova senha."),
}).strict().refine((input) => input.password === input.confirmPassword, {
  path: ["confirmPassword"], message: "As senhas não coincidem.",
});
export type RegisterInput = z.infer<typeof registerSchema>;
