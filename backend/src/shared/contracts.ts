/**
 * API contract shared by the web and API apps.
 *
 * This project keeps frontend and backend as independent npm projects, so this
 * contract exists in both apps:
 *   backend/src/shared/contracts.ts
 *   frontend/lib/contracts.ts
 * The two copies must stay byte-for-byte identical; CI enforces it with
 * `scripts/check-contracts.mjs`. Only Zod and pure TypeScript belong here — no
 * Node, React or database code.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Roles and permissions
// ---------------------------------------------------------------------------

export const ROLES = ["superadmin", "admin", "coach", "member"] as const;
export type Role = (typeof ROLES)[number];

export const roleSchema = z.enum(ROLES);

/** Roles that can access the staff dashboard at all. */
export const STAFF_ROLES = ["superadmin", "admin", "coach"] as const satisfies readonly Role[];

/** Roles that must enroll in TOTP before using privileged routes. */
export const PRIVILEGED_ROLES = ["superadmin", "admin"] as const satisfies readonly Role[];

export function isStaffRole(role: Role): boolean {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}

export function isPrivilegedRole(role: Role): boolean {
  return (PRIVILEGED_ROLES as readonly Role[]).includes(role);
}

/**
 * Coarse capabilities for route-level RBAC. Resource-level scoping (own
 * session, own member) stays in the API service layer.
 */
export const PERMISSIONS = [
  "dashboard:view",
  "schedule:view",
  "schedule:manage",
  "bookings:view",
  "bookings:manage",
  "members:view",
  "members:manage",
  "coaches:view",
  "coaches:manage",
  "leads:view",
  "leads:manage",
  "billing:view",
  "billing:manage",
  "team:manage",
  "audit:view",
  "settings:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const permissionSchema = z.enum(PERMISSIONS);

const ADMIN_PERMISSIONS = [
  "dashboard:view",
  "schedule:view",
  "schedule:manage",
  "bookings:view",
  "bookings:manage",
  "members:view",
  "members:manage",
  "coaches:view",
  "coaches:manage",
  "leads:view",
  "leads:manage",
] as const satisfies readonly Permission[];

const COACH_PERMISSIONS = [
  "dashboard:view",
  "schedule:view",
  "bookings:view",
] as const satisfies readonly Permission[];

/**
 * Deny by default: a role with no entry has no staff permissions.
 * Billing, team, audit and settings are superadmin-only.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  superadmin: PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  coach: COACH_PERMISSIONS,
  member: [],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Stable, machine-readable error codes. Never expose stack traces. */
export const errorCodeSchema = z
  .string()
  .min(1)
  .regex(/^[A-Z][A-Z0-9_]*$/, "Error codes are SCREAMING_SNAKE_CASE");

export const apiErrorSchema = z
  .object({
    error: z
      .object({
        code: errorCodeSchema,
        message: z.string().min(1),
        details: z.unknown().optional(),
        requestId: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const healthStatusSchema = z.enum(["ok", "degraded"]);
export const healthDbStatusSchema = z.enum(["ok", "down"]);

export const healthResponseSchema = z
  .object({
    status: healthStatusSchema,
    db: healthDbStatusSchema,
    version: z.string().min(1),
  })
  .strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// ---------------------------------------------------------------------------
// IDs and pagination
// ---------------------------------------------------------------------------

/** Mongo ObjectId as a 24-character hex string. */
export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid ObjectId");

export type ObjectIdString = z.infer<typeof objectIdSchema>;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z
    .object({
      items: z.array(itemSchema),
      page: z.number().int().min(1),
      limit: z.number().int().min(1).max(MAX_PAGE_SIZE),
      total: z.number().int().min(0),
      hasMore: z.boolean(),
    })
    .strict();
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}
