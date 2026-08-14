import type { TenantKey } from './types';

/**
 * Tenant identifiers shared across local and staging.
 * Both tenants use the same application and role set; only base URL differs.
 */
export const TENANT_KEYS = ['kedemo', 'ketest'] as const;

export const DEFAULT_TENANT: TenantKey = 'kedemo';

export function isTenantKey(value: string): value is TenantKey {
  return (TENANT_KEYS as readonly string[]).includes(value);
}

/**
 * Prefix used for tenant-scoped credential environment variables.
 * Example: kedemo → KEDEMO
 */
export function tenantEnvPrefix(tenant: TenantKey): string {
  return tenant.toUpperCase();
}
