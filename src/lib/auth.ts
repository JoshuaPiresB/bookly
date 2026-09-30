import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// Login com Google temporariamente desativado. Para reativar, restaure este import
// e os dois blocos identificados como "Google OAuth" abaixo.
// import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import { authenticateUser } from "@/features/auth/auth.service";
// import { authenticateGoogleUser } from "@/features/auth/auth.service";
import { AppError } from "@/lib/errors";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export function getAuthOptions(): NextAuthOptions {
  const env = getServerEnv();
  const providers: NextAuthOptions["providers"] = [CredentialsProvider({
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
  })];
  // Google OAuth (temporariamente desativado):
  // if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  //   providers.push(GoogleProvider({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }));
  // }

  return {
    secret: env.AUTH_SECRET,
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
    pages: { signIn: "/login", error: "/login" },
    providers,
    callbacks: {
      // Google OAuth (temporariamente desativado):
      // async signIn({ user, account, profile }) {
      //   if (account?.provider !== "google") return true;
      //   const googleProfile = profile as GoogleProfile | undefined;
      //   if (!googleProfile?.email_verified || !googleProfile.sub || !user.email) return false;
      //   try {
      //     const localUser = await authenticateGoogleUser({
      //       googleId: googleProfile.sub,
      //       email: user.email,
      //       name: user.name ?? user.email.split("@")[0],
      //       avatarUrl: user.image,
      //     });
      //     user.id = localUser.id;
      //     user.name = localUser.name;
      //     user.email = localUser.email;
      //     user.image = localUser.avatarUrl;
      //     user.sessionVersion = localUser.sessionVersion;
      //     return true;
      //   } catch {
      //     console.error("[Bookly auth] Não foi possível vincular a conta Google.");
      //     return false;
      //   }
      // },
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
