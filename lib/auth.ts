import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { createUser, getUserByEmail, getUserById } from "./db";

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = getUserByEmail(credentials.email as string);
        if (!user) {
          return null;
        }

        const isValid = await compare(credentials.password as string, user.password_hash);
        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "worldcup-predict-secret-key-change-in-production",
});

// Helper functions for auth operations
export async function registerUser(email: string, password: string, name?: string) {
  const existing = getUserByEmail(email);
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hash(password, 12);
  const result = createUser(email, passwordHash, name);
  return { id: String(result.lastInsertRowid), email, name: name || email.split("@")[0] };
}

export async function loginUser(email: string, password: string) {
  const user = getUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  const isValid = await compare(password, user.password_hash);
  if (!isValid) {
    throw new Error("Invalid password");
  }

  return { id: String(user.id), email: user.email, name: user.name };
}
