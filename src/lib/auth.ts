import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "@/features/auth/auth.service";
import { AppError } from "@/lib/errors";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export function getAuthOptions(): NextAuthOptions {
  return {
    secret: getServerEnv().AUTH_SECRET,
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
    pages: { signIn: "/login", error: "/login" },
    providers: [CredentialsProvider({
      name: "E-mail e senha",
      credentials: { email: { label: "E-mail", type: "email" }, password: { label: "Senha", type: "password" } },
      async authorize(credentials) {
        try { return await authenticateUser(credentials); }
        catch (error) {
          if (error instanceof AppError && error.code === "RATE_LIMITED") throw new Error("RATE_LIMITED");
          console.error("[Bookly] Serviço de login indisponível.");
          throw new Error("AUTH_UNAVAILABLE");
        }
      },
    })],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.sub = user.id;
          token.sessionVersion = user.sessionVersion;
        }
        // A validação também cobre /api/auth/session e tokens antigos.
        if (!token.sub) return {};
        const current = await getDb().user.findUnique({ where: { id: token.sub }, select: { id: true, name: true, email: true, avatarUrl: true, sessionVersion: true } });
        if (!current || current.sessionVersion !== token.sessionVersion) return {};
        return { ...token, name: current.name, email: current.email, picture: current.avatarUrl };
      },
      async session({ session, token }) {
        if (!token.sub) return { expires: session.expires };
        return { ...session, user: { id: token.sub, name: token.name, email: token.email, image: token.picture } };
      },
      async redirect({ url, baseUrl }) {
        if (url.startsWith("/") && !url.startsWith("//")) return `${baseUrl}${url}`;
        try { if (new URL(url).origin === baseUrl) return url; } catch { /* Voltar à aplicação. */ }
        return baseUrl;
      },
    },
    logger: {
      error(code) { console.error("[Bookly auth]", code); },
      warn(code) { console.warn("[Bookly auth]", code); },
      debug() {},
    },
  };
}
