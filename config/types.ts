/**
 * Shared configuration types for Tempo Tour web automation.
 */

export type EnvironmentName = 'local' | 'staging';

export type TenantKey = 'kedemo' | 'ketest';

/**
 * Role keys used by automation (stable identifiers).
 * Display titles match application role titles in the tenant DB.
 */
export type RoleKey =
  | 'super-admin'
  | 'admin'
  | 'band'
  | 'crew'
  | 'travel-agent'
  | 'driver';

export interface TenantUrls {
  kedemo: string;
  ketest: string;
}

export interface EnvironmentConfig {
  name: EnvironmentName;
  /** Tenant web app base URLs (no trailing slash). */
  tenants: TenantUrls;
  /**
   * Portal is a separate application surface.
   * Empty string means not configured for this environment yet.
   */
  portalUrl: string;
}

export interface RoleDefinition {
  key: RoleKey;
  /** Exact role title stored in session / roles.title */
  title: string;
  /** Env var holding the username for a given tenant+role */
  usernameEnvVar: (tenant: TenantKey) => string;
  /** Env var holding the password for a given tenant+role */
  passwordEnvVar: (tenant: TenantKey) => string;
}

/**
 * Resolved runtime context: environment + tenant (+ optional role).
 * Future fixtures/auth will consume this instead of hardcoding URLs.
 */
export interface AppContext {
  environment: EnvironmentName;
  tenant: TenantKey;
  role: RoleKey;
  baseUrl: string;
  portalUrl: string;
  usernameEnvVar: string;
  passwordEnvVar: string;
}
