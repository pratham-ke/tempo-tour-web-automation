import type { EnvironmentName, RoleKey, TenantKey } from './types';

/**
 * Roles included in the initial authentication / storageState setup.
 * Other roles remain configured in roles.ts for later enablement.
 */
export const AUTH_SETUP_ROLES = ['super-admin', 'admin', 'band'] as const;

export type AuthSetupRole = (typeof AUTH_SETUP_ROLES)[number];

export function isAuthSetupRole(role: RoleKey): role is AuthSetupRole {
  return (AUTH_SETUP_ROLES as readonly string[]).includes(role);
}

/**
 * storageState path:
 *   auth/{environment}/{tenant}/{role}.json
 * Example:
 *   auth/local/kedemo/super-admin.json
 */
export function getStorageStatePath(
  environment: EnvironmentName,
  tenant: TenantKey,
  role: RoleKey,
): string {
  return `auth/${environment}/${tenant}/${role}.json`;
}

export function getStorageStateDir(
  environment: EnvironmentName,
  tenant: TenantKey,
): string {
  return `auth/${environment}/${tenant}`;
}
