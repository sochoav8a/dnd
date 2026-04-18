import type { Db } from "@dnd/db";
import type { JwtPayload } from "../auth/jwt.js";
import { extractTokenFromRequest } from "../auth/jwt.js";
import { getDb } from "@dnd/db";

export interface GraphQLContext {
  db: Db;
  user: JwtPayload | null;
}

export function createContext(req: { headers: { authorization?: string | undefined } }): GraphQLContext {
  const user = extractTokenFromRequest(req);
  return {
    db: getDb(),
    user,
  };
}

/**
 * Throws a GraphQL error if no authenticated user is in context.
 */
export function requireAuth(ctx: GraphQLContext): JwtPayload {
  if (!ctx.user) {
    throw new Error("UNAUTHENTICATED");
  }
  return ctx.user;
}
