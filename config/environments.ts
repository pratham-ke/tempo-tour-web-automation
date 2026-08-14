import type { EnvironmentConfig, EnvironmentName, TenantKey } from './types';

/**
 * Single source of truth for environment → tenant/portal URLs.
 * Do not duplicate these URLs in other config files.
 */
export const environments: Record<EnvironmentName, EnvironmentConfig> = {
  local: {
    name: 'local',
    tenants: {
      kedemo: 'http://kedemo.localhost:8080',
      ketest: 'http://ketest.localhost:8080',
    },
    // Local Docker portal (separate surface from tenant apps)
    portalUrl: 'http://tourprosandbox.localhost:8080/portal',
  },
  staging: {
    name: 'staging',
    tenants: {
      kedemo: 'https://kedemo.tourprosandbox.yourtempo.com',
      ketest: 'https://ketest.tourprosandbox.yourtempo.com',
    },
    // Staging portal URL not provided yet — set when known
    portalUrl: '',
  },
};

export const ENVIRONMENT_NAMES = Object.keys(environments) as EnvironmentName[];

export function isEnvironmentName(value: string): value is EnvironmentName {
  return value === 'local' || value === 'staging';
}

export function getEnvironmentConfig(name: EnvironmentName): EnvironmentConfig {
  return environments[name];
}

export function getTenantBaseUrl(
  environment: EnvironmentName,
  tenant: TenantKey,
): string {
  return environments[environment].tenants[tenant];
}

export function getPortalUrl(environment: EnvironmentName): string {
  return environments[environment].portalUrl;
}
