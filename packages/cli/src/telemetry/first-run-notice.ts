import { readConfig } from '../lib/config-file.js';

/**
 * Print a one-time notice about anonymous telemetry the first time the CLI
 * runs (before the config file exists). Non-interactive, non-blocking.
 */
export function maybePrintFirstRunNotice(): void {
  if (readConfig()) return;
  const msg =
    '\n' +
    'walkerOS collects anonymous usage telemetry to help us improve the CLI.\n' +
    'No PII is collected. See what we send: <package>/src/telemetry/flow.json\n' +
    'Opt out: set DO_NOT_TRACK=1 or WALKEROS_TELEMETRY_DISABLED=1,\n' +
    '         or run: walkeros telemetry disable\n\n';
  process.stderr.write(msg);
}
