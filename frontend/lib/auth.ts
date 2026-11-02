import type { Role } from "./contracts";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Placeholder until Phase 1 wires Better Auth. Components should depend on
 * this shape rather than calling the auth library directly.
 */
export async function getSession(): Promise<SessionUser | null> {
  return null;
}
