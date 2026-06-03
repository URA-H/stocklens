import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        // Load subscription info on sign-in
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { subscriptionStatus: true, trialEndsAt: true },
        });
        if (dbUser) {
          token.subscriptionStatus = dbUser.subscriptionStatus;
          token.trialEndsAt = dbUser.trialEndsAt.toISOString();
        }
      }
      // Refresh subscription status periodically (on every session update)
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionStatus: true, trialEndsAt: true },
        });
        if (dbUser) {
          token.subscriptionStatus = dbUser.subscriptionStatus;
          token.trialEndsAt = dbUser.trialEndsAt.toISOString();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.subscriptionStatus = token.subscriptionStatus as string;
        session.user.trialEndsAt = token.trialEndsAt as string;
      }
      return session;
    },
  },
});
