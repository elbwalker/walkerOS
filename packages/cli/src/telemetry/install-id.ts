import { randomUUID } from 'crypto';
import { readConfig, writeTelemetryOnlyConfig } from '../lib/config-file.js';

/**
 * Anonymous installation UUID. Generated on first call and persisted in the
 * existing walkerOS config file. Stable across CLI invocations for the user.
 */
export function getInstallationId(): string {
  const existing = readConfig()?.installationId;
  if (existing) return existing;
  const id = randomUUID();
  writeTelemetryOnlyConfig({ installationId: id });
  return id;
}
