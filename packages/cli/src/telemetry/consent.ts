import { readConfig } from '../lib/config-file.js';

function envFlag(name: string): boolean {
  const v = process.env[name];
  return v === '1' || v === 'true';
}

/**
 * Is telemetry actively enabled for this process?
 *
 * Returns `true` only when the user has given explicit consent via
 * `walkeros telemetry enable` (recorded as `telemetryEnabled: true` in the
 * config file). Every other state (no config, config without the field, or
 * `telemetryEnabled: false`) returns `false`.
 *
 * `DO_NOT_TRACK` and `WALKEROS_TELEMETRY_DISABLED` are honored as forced-off
 * overrides for backward compatibility and for users who want a belt-and-
 * braces guarantee even after opting in.
 */
export function isTelemetryEnabled(): boolean {
  if (envFlag('DO_NOT_TRACK')) return false;
  if (envFlag('WALKEROS_TELEMETRY_DISABLED')) return false;
  return readConfig()?.telemetryEnabled === true;
}

/** Whether telemetry debug logging is enabled via `WALKEROS_TELEMETRY_DEBUG`. */
export function isDebugMode(): boolean {
  return envFlag('WALKEROS_TELEMETRY_DEBUG');
}
