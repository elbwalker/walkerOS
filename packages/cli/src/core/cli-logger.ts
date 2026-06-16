/* eslint-disable no-console */
import chalk from 'chalk';
import { createLogger, Level } from '@walkeros/core';
import type { Logger } from '@walkeros/core';
import { scrubSecrets } from './redact-line.js';

export interface CLILoggerOptions {
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
  stderr?: boolean;
  onLine?: (level: Level, message: string) => void;
}

/**
 * Build the `Logger.Config` (level + handler + jsonHandler) that backs the
 * CLI logger. Returned separately so the runner can hand the SAME handler
 * (including the `onLine` ring tap) to the deployed bundle's collector.
 *
 * The collector in a deployed bundle builds its own logger from this config
 * (`config.logger`), so its destination errors flow through the identical
 * `onLine` tap the runner CLI logger uses, landing in the shared ErrorRing.
 * There is no parallel ring: one handler, one tap.
 *
 * Level: `Level.DEBUG` so the handler sees every line and controls visibility
 * itself (verbose/silent gating). ERROR is therefore always emitted into the
 * ring regardless of `--verbose`.
 */
export function createCLILoggerConfig(
  options: CLILoggerOptions = {},
): Logger.Config {
  const {
    verbose = false,
    silent = false,
    json = false,
    stderr = false,
  } = options;
  const out = stderr ? console.error : console.log;

  return {
    // Let handler control visibility — pass everything through. With the gate
    // at DEBUG, ERROR always reaches the handler (and the ring) even without
    // --verbose.
    level: Level.DEBUG,
    handler: (level, message, _context, scope) => {
      // Build formatted message
      const scopePath = scope.length > 0 ? `[${scope.join(':')}] ` : '';
      // Redact secrets ONCE here, before BOTH the onLine ring tap and the
      // console.* output. stderr is shipped directly by Cockpit/Loki, so the
      // heartbeat-egress redactor alone (runtime/redact.ts) would miss it; doing
      // it in the handler scrubs every line routed through this logger
      // (collector + steps, via the D1 wiring) on both paths. Length is
      // preserved here (no truncation); the heartbeat path applies the 256-char
      // wire cap separately as a backstop on already-redacted text.
      const fullMessage = scrubSecrets(`${scopePath}${message}`);

      // Tap every line before any early return so no level is dropped from capture.
      try {
        options.onLine?.(level, fullMessage);
      } catch {
        // Swallow: a throwing consumer must never break logging (and we must
        // not call logger methods here to avoid infinite recursion).
      }

      // ERROR: always shown unless json mode
      if (level === Level.ERROR) {
        if (!json) console.error(chalk.red(fullMessage));
        return;
      }

      // Non-errors suppressed in silent or json mode
      if (silent || json) return;

      // DEBUG: only with verbose
      if (level === Level.DEBUG) {
        if (!verbose) return;
        out(`  ${fullMessage}`);
        return;
      }

      // WARN / INFO: normal output
      out(fullMessage);
    },
    jsonHandler: (data) => {
      if (!silent) out(JSON.stringify(data, null, 2));
    },
  };
}

/**
 * Create a core Logger.Instance with CLI-appropriate behavior.
 *
 * Replaces the old CLI logger, adaptLogger, and createCollectorLoggerConfig.
 * One factory, one logger type, DRY.
 *
 * Behavior:
 * - ERROR: always shown (chalk red, via console.error) unless --json
 * - WARN: shown unless --silent or --json
 * - INFO: shown unless --silent or --json
 * - DEBUG: shown only with --verbose (and not --silent/--json)
 * - json(): shown unless --silent
 */
export function createCLILogger(
  options: CLILoggerOptions = {},
): Logger.Instance {
  return createLogger(createCLILoggerConfig(options));
}
