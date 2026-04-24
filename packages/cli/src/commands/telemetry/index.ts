import { readConfig, writeTelemetryOnlyConfig } from '../../lib/config-file.js';
import { createInstallationId } from '../../telemetry/install-id.js';

function envOverrideReason(): string | undefined {
  if (process.env.DO_NOT_TRACK === '1' || process.env.DO_NOT_TRACK === 'true') {
    return 'DO_NOT_TRACK env var';
  }
  if (
    process.env.WALKEROS_TELEMETRY_DISABLED === '1' ||
    process.env.WALKEROS_TELEMETRY_DISABLED === 'true'
  ) {
    return 'WALKEROS_TELEMETRY_DISABLED env var';
  }
  return undefined;
}

/**
 * Report current telemetry state to stdout. Three possible outcomes:
 *
 *  - Not yet chosen: config has no `telemetryEnabled` field.
 *  - Enabled: `telemetryEnabled === true`.
 *  - Disabled: `telemetryEnabled === false`, or forced off by an env var.
 */
export function telemetryStatusCommand(): void {
  const override = envOverrideReason();
  if (override) {
    process.stdout.write(
      `walkerOS telemetry: disabled (${override})\n` +
        'Unset the env var and run `walkeros telemetry status` to see the stored choice.\n',
    );
    return;
  }

  const stored = readConfig()?.telemetryEnabled;
  if (stored === true) {
    process.stdout.write(
      'walkerOS telemetry: enabled\n' +
        'Opt out any time with `walkeros telemetry disable`.\n',
    );
    return;
  }
  if (stored === false) {
    process.stdout.write(
      'walkerOS telemetry: disabled\n' +
        'Opt in any time with `walkeros telemetry enable`.\n',
    );
    return;
  }
  process.stdout.write(
    'walkerOS telemetry: not yet chosen (default: off)\n' +
      'Opt in with `walkeros telemetry enable`, or leave off, nothing is sent until you choose.\n',
  );
}

/**
 * Persist explicit consent: `telemetryEnabled: true` plus a stable
 * installation UUID. `createInstallationId` is idempotent, re-enabling
 * preserves any existing UUID.
 */
export function telemetryEnableCommand(): void {
  const installationId = createInstallationId();
  writeTelemetryOnlyConfig({
    installationId,
    telemetryEnabled: true,
  });
  process.stdout.write(
    'walkerOS telemetry enabled. Thank you for helping improve the tools.\n' +
      'Installation UUID: ' +
      installationId +
      '\n',
  );
}

/**
 * Persist explicit refusal: `telemetryEnabled: false`. Does not create an
 * installation UUID, a disabled state has no need for a stable identifier.
 * Preserves any existing UUID (e.g. from a prior enable) so re-enabling
 * later keeps the same id.
 */
export function telemetryDisableCommand(): void {
  writeTelemetryOnlyConfig({ telemetryEnabled: false });
  process.stdout.write(
    'walkerOS telemetry disabled. Nothing will be sent from this machine.\n',
  );
}
