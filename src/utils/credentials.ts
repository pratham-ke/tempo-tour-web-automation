import {
  getRolePasswordEnvVar,
  getRoleUsernameEnvVar,
} from '../../config/roles';
import type { RoleKey, TenantKey } from '../../config/types';

export interface Credentials {
  username: string;
  password: string;
  usernameEnvVar: string;
  passwordEnvVar: string;
}

/**
 * Read credentials from environment variables.
 * Returns null when either value is missing — never invents credentials.
 */
export function readCredentials(
  tenant: TenantKey,
  role: RoleKey,
): Credentials | null {
  const usernameEnvVar = getRoleUsernameEnvVar(tenant, role);
  const passwordEnvVar = getRolePasswordEnvVar(tenant, role);
  const username = process.env[usernameEnvVar]?.trim();
  const password = process.env[passwordEnvVar]?.trim();

  if (!username || !password) {
    return null;
  }

  return { username, password, usernameEnvVar, passwordEnvVar };
}

export function requireCredentials(
  tenant: TenantKey,
  role: RoleKey,
): Credentials {
  const credentials = readCredentials(tenant, role);
  if (!credentials) {
    const usernameEnvVar = getRoleUsernameEnvVar(tenant, role);
    const passwordEnvVar = getRolePasswordEnvVar(tenant, role);
    throw new Error(
      `Missing credentials for ${tenant}/${role}. ` +
        `Set ${usernameEnvVar} and ${passwordEnvVar} in .env.local or the environment.`,
    );
  }
  return credentials;
}
