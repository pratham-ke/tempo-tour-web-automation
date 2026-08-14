import {
  getEnvironmentConfig,
  getPortalUrl,
  getTenantBaseUrl,
  isEnvironmentName,
} from './environments';
import {
  DEFAULT_ROLE,
  getRole,
  getRolePasswordEnvVar,
  getRoleUsernameEnvVar,
  isRoleKey,
} from './roles';
import { DEFAULT_TENANT, isTenantKey } from './tenants';
import type { AppContext, EnvironmentName, RoleKey, TenantKey } from './types';

export * from './types';
export * from './environments';
export * from './tenants';
export * from './roles';
export * from './routes';
export * from './timeouts';
export * from './auth';

export interface ResolveAppContextOptions {
  environment?: EnvironmentName | string;
  tenant?: TenantKey | string;
  role?: RoleKey | string;
}

/**
 * Resolve environment from TEST_ENV (default: local).
 */
export function resolveEnvironment(
  value: string | undefined = process.env.TEST_ENV,
): EnvironmentName {
  const normalized = (value ?? 'local').trim().toLowerCase();
  if (!isEnvironmentName(normalized)) {
    throw new Error(
      `Invalid TEST_ENV "${value}". Expected one of: local, staging`,
    );
  }
  return normalized;
}

/**
 * Resolve tenant from TEST_TENANT or DEFAULT_TENANT (default: kedemo).
 */
export function resolveTenant(
  value: string | undefined = process.env.TEST_TENANT ?? process.env.DEFAULT_TENANT,
): TenantKey {
  const normalized = (value ?? DEFAULT_TENANT).trim().toLowerCase();
  if (!isTenantKey(normalized)) {
    throw new Error(
      `Invalid tenant "${value}". Expected one of: kedemo, ketest`,
    );
  }
  return normalized;
}

/**
 * Resolve role from TEST_ROLE (default: super-admin).
 */
export function resolveRole(
  value: string | undefined = process.env.TEST_ROLE,
): RoleKey {
  const normalized = (value ?? DEFAULT_ROLE).trim().toLowerCase();
  if (!isRoleKey(normalized)) {
    throw new Error(
      `Invalid TEST_ROLE "${value}". Expected a configured role key (e.g. super-admin, band)`,
    );
  }
  return normalized;
}

/**
 * Central selector for future tests/fixtures:
 *   environment + tenant + role → AppContext
 *
 * Does not read or validate credential values — only exposes env var names.
 */
export function resolveAppContext(
  options: ResolveAppContextOptions = {},
): AppContext {
  const environment = resolveEnvironment(
    options.environment !== undefined
      ? String(options.environment)
      : process.env.TEST_ENV,
  );
  const tenant = resolveTenant(
    options.tenant !== undefined
      ? String(options.tenant)
      : process.env.TEST_TENANT ?? process.env.DEFAULT_TENANT,
  );
  const role = resolveRole(
    options.role !== undefined ? String(options.role) : process.env.TEST_ROLE,
  );

  // Ensures environment config exists (throws if misconfigured in the map)
  getEnvironmentConfig(environment);

  return {
    environment,
    tenant,
    role,
    baseUrl: getTenantBaseUrl(environment, tenant),
    portalUrl: getPortalUrl(environment),
    usernameEnvVar: getRoleUsernameEnvVar(tenant, role),
    passwordEnvVar: getRolePasswordEnvVar(tenant, role),
  };
}

/** Role display title for assertions / logging (matches app roles.title). */
export function getRoleTitle(role: RoleKey): string {
  return getRole(role).title;
}
