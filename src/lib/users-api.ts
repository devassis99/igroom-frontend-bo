import { apiRequest } from "./api-client";

export interface BoUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  mfaEnabled: boolean;
  /** Has this invite been accepted — signed in with Google at least once? False = still a pending invite. */
  claimed: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface InviteUserInput {
  email: string;
  name: string;
  roleId: string;
}

export interface BoRole {
  id: string;
  name: string;
  description: string | null;
  /** Permission keys currently granted to this role. */
  permissions: string[];
  userCount: number;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionKeys: string[];
}

export interface BoEndpointRef {
  method: string;
  path: string;
  name: string;
}

export interface PermissionCatalogEntry {
  key: string;
  name: string;
  description: string | null;
  /** Which API endpoints this permission unlocks — descriptive only. */
  endpoints: BoEndpointRef[];
}

/**
 * Thin, 1:1 wrappers around igroom-backend's /users/* routes
 * (src/modules/auth/users.routes.ts) — same pattern as
 * src/lib/billing-api.ts. Every call is bearer-token authenticated via
 * apiRequest and is itself permission-gated server-side (users.view /
 * users.manage) — a role without the permission gets a 403 here even
 * if the Users tab were somehow reached.
 */
export const usersApi = {
  list: () => apiRequest<{ users: BoUser[] }>("/users"),

  invite: (input: InviteUserInput) =>
    apiRequest<{ user: BoUser }>("/users", { method: "POST", body: input }),

  updateRole: (userId: string, roleId: string) =>
    apiRequest<{ user: BoUser }>(`/users/${userId}/role`, {
      method: "PATCH",
      body: { roleId },
    }),

  setActive: (userId: string, isActive: boolean) =>
    apiRequest<{ user: BoUser }>(`/users/${userId}/active`, {
      method: "PATCH",
      body: { isActive },
    }),
};

/**
 * Thin, 1:1 wrappers around igroom-backend's /roles/* routes
 * (src/modules/auth/roles.routes.ts).
 */
export const rolesApi = {
  list: () => apiRequest<{ roles: BoRole[] }>("/roles"),

  listPermissions: () => apiRequest<{ permissions: PermissionCatalogEntry[] }>("/roles/permissions"),

  create: (input: CreateRoleInput) =>
    apiRequest<{ role: BoRole }>("/roles", { method: "POST", body: input }),

  updatePermissions: (roleId: string, permissionKeys: string[]) =>
    apiRequest<{ role: BoRole }>(`/roles/${roleId}/permissions`, {
      method: "PATCH",
      body: { permissionKeys },
    }),

  remove: (roleId: string) => apiRequest<void>(`/roles/${roleId}`, { method: "DELETE" }),
};
