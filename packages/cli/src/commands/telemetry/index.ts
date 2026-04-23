import { readConfig, writeTelemetryOnlyConfig } from '../../lib/config-file.js';
import { isTelemetryEnabled } from '../../telemetry/opt-out.js';
import { getInstallationId } from '../../telemetry/install-id.js';

/**
 * Report current telemetry status to stdout.
 *
 * When disabled, lists the reason(s): DO_NOT_TRACK env var,
 * WALKEROS_TELEMETRY_DISABLED env var, and/or config file.
 */
export function telemetryStatusCommand(): void {
  const enabled = isTelemetryEnabled();
  if (enabled) {
    process.stdout.write('walkerOS telemetry: enabled\n');
    process.stdout.write(
      'Disable with: DO_NOT_TRACK=1, WALKEROS_TELEMETRY_DISABLED=1, or `walkeros telemetry disable`\n',
    );
    return;
  }
  const reasons: string[] = [];
  if (process.env.DO_NOT_TRACK === '1' || process.env.DO_NOT_TRACK === 'true') {
    reasons.push('DO_NOT_TRACK env var');
  }
  if (
    process.env.WALKEROS_TELEMETRY_DISABLED === '1' ||
    process.env.WALKEROS_TELEMETRY_DISABLED === 'true'
  ) {
    reasons.push('WALKEROS_TELEMETRY_DISABLED env var');
  }
  if (readConfig()?.telemetryEnabled === false) reasons.push('config file');
  process.stdout.write(
    `walkerOS telemetry: disabled (${reasons.join(', ')})\n`,
  );
}

/**
 * Persist `telemetryEnabled: true` to the config. Lazily seeds the
 * installation ID via `getInstallationId()` first so the config always has a
 * stable id when opting in.
 */
export function telemetryEnableCommand(): void {
  const installationId = getInstallationId();
  writeTelemetryOnlyConfig({
    installationId,
    telemetryEnabled: true,
  });
  process.stdout.write('walkerOS telemetry enabled.\n');
}

/**
 * Persist `telemetryEnabled: false` to the config. Lazily seeds the
 * installation ID first so the stored config remains consistent.
 */
export function telemetryDisableCommand(): void {
  const installationId = getInstallationId();
  writeTelemetryOnlyConfig({
    installationId,
    telemetryEnabled: false,
  });
  process.stdout.write('walkerOS telemetry disabled.\n');
}
