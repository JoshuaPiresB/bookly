import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  resetTokenSchema,
} from "@/features/auth/auth.schema";

const valid = { name: "Pedro", email: "Pedro@example.com", password: "Senha longa 123!", confirmPassword: "Senha longa 123!" };

describe("validação de autenticação", () => {
  it("normaliza nome/e-mail e preserva senha", () => {
    expect(registerSchema.parse({ ...valid, name: " Pedro ", email: " PEDRO@example.com " })).toEqual({ ...valid, name: "Pedro", email: "pedro@example.com" });
  });
  it.each([
    { name: "   " }, { email: "invalido" }, { password: "123", confirmPassword: "123" },
    { confirmPassword: "diferente" }, { password: " ".repeat(12), confirmPassword: " ".repeat(12) },
    { password: "🔒".repeat(30), confirmPassword: "🔒".repeat(30) }, { userId: "forjado" },
  ])("recusa entrada inválida: %j", (change) => {
    expect(registerSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
  it("retorna confirmação em português", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "diferente" });
    if (result.success) throw new Error("Validação deveria falhar.");
    expect(result.error.issues[0]?.message).toBe("As senhas não coincidem.");
  });
  it("valida login sem depender da confirmação", () => {
    expect(loginSchema.safeParse({ email: valid.email, password: valid.password }).success).toBe(true);
  });
  it("valida solicitação e redefinição de senha", () => {
    const token = "a".repeat(64);
    expect(forgotPasswordSchema.parse({ email: " PEDRO@example.com " })).toEqual({ email: "pedro@example.com" });
    expect(resetTokenSchema.safeParse(token).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token, password: valid.password, confirmPassword: valid.password }).success).toBe(true);
  });
  it("recusa token, senha e confirmação inválidos na redefinição", () => {
    expect(resetTokenSchema.safeParse("token-curto").success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "a".repeat(64), password: "curta", confirmPassword: "curta" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "a".repeat(64), password: valid.password, confirmPassword: "Outra senha 123!" }).success).toBe(false);
  });
});
