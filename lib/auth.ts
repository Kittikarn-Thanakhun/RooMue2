import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      phone: { label: "Phone", type: "tel" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const password = credentials?.password;
      if (!credentials?.phone || !password) return null;

      // ---- Test access (demo, no registration required) -------------------
      // Entering the test code in BOTH phone and password signs in to a shared
      // demo account. Never active in production — NODE_ENV guard is the
      // primary lock; ENABLE_TEST_LOGIN=true is a secondary opt-in for dev/staging.
      const testCode = process.env.TEST_LOGIN_CODE || "12345678";
      const testEnabled =
        process.env.NODE_ENV !== "production" &&
        process.env.ENABLE_TEST_LOGIN !== "false";
      if (testEnabled && credentials.phone === testCode && password === testCode) {
        const demo = await prisma.user.upsert({
          where: { phone: "0000000000" },
          update: {},
          create: {
            phone: "0000000000",
            firstName: "Demo",
            lastName: "User",
            phoneVerified: new Date(),
          },
        });
        return {
          id: demo.id,
          name: "Demo User",
          image: null,
        };
      }

      const phone = normalizePhone(credentials.phone);
      if (!phone) return null;

      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        image: user.image,
      };
    },
  }),
];

// Only enable Google when credentials are present so local dev runs without it.
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (googleEnabled) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
