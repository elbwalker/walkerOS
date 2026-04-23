import { readConfig } from '../lib/config-file.js';

function envFlag(name: string): boolean {
  const v = process.env[name];
  return v === '1' || v === 'true';
}

/**
 * Resolve whether telemetry is enabled for the current CLI invocation.
 *
 * Priority (first match wins):
 *   1. `DO_NOT_TRACK` env var (industry standard) → disabled
 *   2. `WALKEROS_TELEMETRY_DISABLED` env var → disabled
 *   3. Config file `telemetryEnabled: false` → disabled
 *   4. Default → enabled
 */
export function isTelemetryEnabled(): boolean {
  if (envFlag('DO_NOT_TRACK')) return false;
  if (envFlag('WALKEROS_TELEMETRY_DISABLED')) return false;
  const cfg = readConfig();
  if (cfg?.telemetryEnabled === false) return false;
  return true;
}

/**
 * Whether telemetry debug logging is enabled via `WALKEROS_TELEMETRY_DEBUG`.
 */
export function isDebugMode(): boolean {
  return envFlag('WALKEROS_TELEMETRY_DEBUG');
}
