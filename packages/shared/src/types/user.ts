export type UserRole = "player" | "dm" | "admin";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
}
