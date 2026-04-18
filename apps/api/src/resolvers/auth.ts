import bcrypt from "bcryptjs";
import type { GraphQLContext } from "../graphql/context.js";
import { signToken } from "../auth/jwt.js";
import { eq, schema } from "@dnd/db";

export const authResolvers = {
  Mutation: {
    async register(
      _: unknown,
      { input }: { input: { email: string; username: string; password: string } },
      ctx: GraphQLContext,
    ) {
      const existingByEmail = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, input.email))
        .limit(1);

      if (existingByEmail.length > 0) {
        throw new Error("Email already in use");
      }

      const existingByUsername = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, input.username))
        .limit(1);

      if (existingByUsername.length > 0) {
        throw new Error("Username already taken");
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const [user] = await ctx.db
        .insert(schema.users)
        .values({
          email: input.email,
          username: input.username,
          passwordHash,
        })
        .returning();

      if (!user) throw new Error("Failed to create user");

      const token = signToken({ userId: user.id, email: user.email, role: user.role });
      return { token, user };
    },

    async login(
      _: unknown,
      { input }: { input: { email: string; password: string } },
      ctx: GraphQLContext,
    ) {
      const [user] = await ctx.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, input.email))
        .limit(1);

      if (!user) throw new Error("Invalid credentials");

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new Error("Invalid credentials");

      const token = signToken({ userId: user.id, email: user.email, role: user.role });
      return { token, user };
    },
  },
};
