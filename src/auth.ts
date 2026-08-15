import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { DUMMY_PASSWORD_HASH } from "@/lib/auth/password";
import { getGoogleAuthCredentials } from "@/lib/auth/google";
import { firstEnvironmentValue } from "@/lib/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { loginSchema } from "@/lib/validations";

const configuredSessionMaxAge = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS ?? 28_800);
const sessionMaxAge = Number.isFinite(configuredSessionMaxAge)
  ? Math.min(Math.max(Math.trunc(configuredSessionMaxAge), 900), 86_400)
  : 28_800;

const authSecret =
  firstEnvironmentValue(process.env.AUTH_SECRET, process.env.NEXTAUTH_SECRET) ??
  (process.env.NODE_ENV === "production" ? undefined : "xnutri-local-development-auth-secret");

if (process.env.NODE_ENV === "production" && !authSecret) {
  throw new Error("AUTH_SECRET não configurada. Gere uma chave segura antes de publicar.");
}

const googleAuth = getGoogleAuthCredentials();
const googleProvider = googleAuth.clientId && googleAuth.clientSecret
  ? Google({
      clientId: googleAuth.clientId,
      clientSecret: googleAuth.clientSecret,
    })
  : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: authSecret,
  session: {
    strategy: "jwt",
    maxAge: sessionMaxAge,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  trustHost: process.env.AUTH_TRUST_HOST !== "false",
  providers: [
    Credentials({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const ip = await getClientIp();
        const parsed = loginSchema.safeParse({
          email: String(credentials?.email ?? ""),
          password: String(credentials?.password ?? ""),
        });

        if (!parsed.success) return null;

        const attemptLimit = rateLimit(`credentials:${ip}:${parsed.data.email}`, 8, 5 * 60_000);
        if (!attemptLimit.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) {
          await bcrypt.compare(parsed.data.password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    ...(googleProvider ? [googleProvider] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as { email_verified?: boolean } | undefined;
        return googleProfile?.email_verified === true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as UserRole;
      }

      return session;
    },
  },
});
