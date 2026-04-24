import { randomUUID } from 'crypto';
import { readConfig, writeTelemetryOnlyConfig } from '../lib/config-file.js';

/**
 * Read the stored installation UUID if one exists. Never writes.
 *
 * Returns `undefined` when no config file exists or the config has no
 * `installationId` field, both mean the user has not opted in to telemetry
 * yet, so no persistent identifier has been created.
 */
export function getInstallationId(): string | undefined {
  return readConfig()?.installationId;
}

/**
 * Generate and persist an installation UUID if none exists yet, then return
 * it. Idempotent.
 *
 * This is the only function in the telemetry stack that may write an
 * installation identifier. Callers must only invoke it as part of an opt-in
 * action (the `walkeros telemetry enable` command). Any other caller is a
 * consent-before-write bug.
 */
export function createInstallationId(): string {
  const existing = readConfig()?.installationId;
  if (existing) return existing;
  const id = randomUUID();
  writeTelemetryOnlyConfig({ installationId: id });
  return id;
}
