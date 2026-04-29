import { readConfig } from '../lib/config-file.js';

/**
 * One-time informational notice inviting the user to opt in to anonymous
 * telemetry. Non-blocking. Writes nothing to disk. Suppressed on subsequent
 * runs by the presence of a config file (created by login, project
 * defaults, feedback preferences, or an explicit `walkeros telemetry
 * enable`). If the user never creates a config for any other reason, the
 * notice keeps appearing. That is acceptable: the notice is a one-line
 * informational message, not a prompt.
 */
export function maybePrintFirstRunNotice(): void {
  if (readConfig()) return;
  const msg =
    '\n' +
    'walkerOS can collect anonymous usage telemetry to help us improve the tools.\n' +
    "It's off by default. Nothing is sent until you run `walkeros telemetry enable`.\n" +
    'What we would send: https://github.com/elbwalker/walkerOS/blob/main/packages/cli/src/telemetry/flow.json\n\n';
  process.stderr.write(msg);
}
