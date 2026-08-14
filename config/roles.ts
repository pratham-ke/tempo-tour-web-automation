import { tenantEnvPrefix } from './tenants';
import type { RoleDefinition, RoleKey, TenantKey } from './types';

/**
 * Application roles (same set for kedemo and ketest).
 * Credential values are never stored here — only env var names.
 */
function credentialEnvVars(roleSuffix: string) {
  return {
    usernameEnvVar: (tenant: TenantKey) =>
      `${tenantEnvPrefix(tenant)}_${roleSuffix}_USERNAME`,
    passwordEnvVar: (tenant: TenantKey) =>
      `${tenantEnvPrefix(tenant)}_${roleSuffix}_PASSWORD`,
  };
}

export const roles: Record<RoleKey, RoleDefinition> = {
  'super-admin': {
    key: 'super-admin',
    title: 'Super Admin',
    ...credentialEnvVars('SUPER_ADMIN'),
  },
  admin: {
    key: 'admin',
    title: 'Admin',
    ...credentialEnvVars('ADMIN'),
  },
  band: {
    key: 'band',
    title: 'Band',
    ...credentialEnvVars('BAND'),
  },
  crew: {
    key: 'crew',
    title: 'Crew',
    ...credentialEnvVars('CREW'),
  },
  'travel-agent': {
    key: 'travel-agent',
    title: 'Travel Agent',
    ...credentialEnvVars('TRAVEL_AGENT'),
  },
  driver: {
    key: 'driver',
    title: 'Driver',
    ...credentialEnvVars('DRIVER'),
  },
};

export const ROLE_KEYS = Object.keys(roles) as RoleKey[];

export const DEFAULT_ROLE: RoleKey = 'super-admin';

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value);
}

export function getRole(role: RoleKey): RoleDefinition {
  return roles[role];
}

/** Example: kedemo + super-admin → KEDEMO_SUPER_ADMIN_USERNAME */
export function getRoleUsernameEnvVar(tenant: TenantKey, role: RoleKey): string {
  return roles[role].usernameEnvVar(tenant);
}

/** Example: kedemo + super-admin → KEDEMO_SUPER_ADMIN_PASSWORD */
export function getRolePasswordEnvVar(tenant: TenantKey, role: RoleKey): string {
  return roles[role].passwordEnvVar(tenant);
}
