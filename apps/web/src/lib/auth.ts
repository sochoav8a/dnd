import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getGqlClient, LOGIN_MUTATION } from "./graphql";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        try {
          const client = getGqlClient();
          const data = await client.request<{
            login: { token: string; user: { id: string; email: string; username: string; role: string } };
          }>(LOGIN_MUTATION, {
            input: { email: credentials.email, password: credentials.password },
          });

          const { token, user } = data.login;
          return { id: user.id, email: user.email, name: user.username, role: user.role, token };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token["role"] = (user as { role?: string }).role;
        token["apiToken"] = (user as { token?: string }).token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: unknown })["id"] = token.sub;
        (session.user as { role?: unknown })["role"] = token["role"];
        (session as { apiToken?: unknown })["apiToken"] = token["apiToken"];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
};
