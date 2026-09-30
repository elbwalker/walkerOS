/**
 * Node entry point (`@walkeros/core/node`).
 *
 * Helpers shared by `@walkeros/cli` and `@walkeros/runner` that do not belong
 * in the browser `.` entry: the temp-path helpers import node builtins, the
 * terminal logger config writes to the console, and the secret redactor and
 * the simulate output formatter (`toPrintable`, it reads `Buffer`) have
 * no browser consumer (in `.` it was not tree-shaken out of walker.js). Core gains no dependency
 * for them: the colouriser is injected by the caller, so chalk stays in the
 * packages that already depend on it.
 */

/* eslint-disable no-console */
import os from 'os';
import path from 'path';
import { createLogger } from './logger';
import { maskKnownValues, scrubSecrets } from './redactLine';

export { scrubSecrets, redactLine } from './redactLine';
export type { ScrubOptions } from './redactLine';
export { toPrintable } from './toPrintable';
import type { Config, Instance } from './types/logger';
import { Level } from './types/logger';

const DEFAULT_TMP_ROOT = os.tmpdir();

/**
 * Get a path within the temp directory.
 *
 * @param tmpDir - Custom temp directory (optional, for --tmp-dir flag)
 * @param segments - Path segments to join
 * @returns Absolute path within temp directory
 *
 * @example
 * ```typescript
 * getTmpPath()                           // → "/tmp"
 * getTmpPath(undefined, 'entry.js')      // → "/tmp/entry.js"
 * getTmpPath(undefined, 'cache', 'builds') // → "/tmp/cache/builds"
 * getTmpPath('/custom', 'cache')         // → "/custom/cache"
 * ```
 */
export function getTmpPath(tmpDir?: string, ...segments: string[]): string {
  const root = tmpDir || DEFAULT_TMP_ROOT;
  // Always return absolute path (esbuild requirement)
  const absoluteRoot = path.isAbsolute(root) ? root : path.resolve(root);
  return path.join(absoluteRoot, ...segments);
}

/**
 * A temp path resolver with the root directory baked in.
 *
 * Use {@link createTmpResolver} at entry points to capture the temp root once,
 * then pass the resolver to downstream functions. This prevents the class of
 * bugs where callers forget to pass tmpDir.
 *
 * @example
 * ```typescript
 * const tmp = createTmpResolver(buildOptions.tempDir);
 * const cacheDir = tmp('cache', 'packages');  // root is baked in
 * ```
 */
export type TmpResolver = (...segments: string[]) => string;

export function createTmpResolver(tmpDir?: string): TmpResolver {
  const root = tmpDir || DEFAULT_TMP_ROOT;
  const absoluteRoot = path.isAbsolute(root) ? root : path.resolve(root);
  return (...segments: string[]) => path.join(absoluteRoot, ...segments);
}

/**
 * Get the default temp root directory.
 */
export function getDefaultTmpRoot(): string {
  return DEFAULT_TMP_ROOT;
}

export interface CLILoggerOptions {
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
  stderr?: boolean;
  onLine?: (level: Level, message: string) => void;
  /**
   * Exact secret values masked in every line (see `scrubSecrets`). An array is
   * copied at creation; a function is read per line, so values learned after
   * the logger exists (secrets fetched at startup) are masked too.
   */
  knownSecrets?: readonly string[] | (() => readonly string[]);
}

/** Formats one already-scrubbed line for the terminal. */
export type LineFormatter = (line: string) => string;

/**
 * Per-level terminal formatters. Every level defaults to identity, so a caller
 * that passes nothing gets plain uncoloured output.
 */
export interface CLILoggerColors {
  error?: LineFormatter;
  warn?: LineFormatter;
  info?: LineFormatter;
  debug?: LineFormatter;
}

const identity: LineFormatter = (line) => line;

const TMP_ROOT_LABEL = '$TMPDIR';

/**
 * Replace each occurrence of the literal temp root, followed by a path
 * separator, with `$TMPDIR`. Only occurrences that start a path count: the
 * character before must not continue a path, so `/mnt/tmp/x` keeps its text
 * when the root is `/tmp`. Literal matching only, never a pattern built from
 * the path.
 */
function labelTmpRoot(line: string, root: string): string {
  if (!root || root === path.sep) return line;
  const needle = root.endsWith(path.sep) ? root : root + path.sep;
  const parts = line.split(needle);
  if (parts.length === 1) return line;
  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const before = result.length > 0 ? result[result.length - 1] : '';
    const startsPath = before === '' || !/[\w./\\~-]/.test(before);
    result += (startsPath ? TMP_ROOT_LABEL + path.sep : needle) + parts[i];
  }
  return result;
}

/**
 * Build the `Logger.Config` (level + handler + jsonHandler) that backs a
 * terminal logger. Returned separately so the runtime can hand the SAME
 * handler (including the `onLine` ring tap) to the deployed bundle's
 * collector.
 *
 * The collector in a deployed bundle builds its own logger from this config
 * (`config.logger`), so its destination errors flow through the identical
 * `onLine` tap the runtime logger uses, landing in the shared ErrorRing.
 * There is no parallel ring: one handler, one tap.
 *
 * Level: `Level.DEBUG` so the handler sees every line and controls visibility
 * itself (verbose/silent gating). ERROR is therefore always emitted into the
 * ring regardless of `--verbose`.
 *
 * `colors` formats each level for the terminal. It is applied to console
 * output only, never to the line handed to `onLine`.
 */
export function createCLILoggerConfig(
  options: CLILoggerOptions = {},
  colors: CLILoggerColors = {},
): Config {
  const {
    verbose = false,
    silent = false,
    json = false,
    stderr = false,
    knownSecrets,
  } = options;
  const knownCopy =
    typeof knownSecrets === 'function'
      ? undefined
      : knownSecrets
        ? [...knownSecrets]
        : undefined;
  const readKnown = (): readonly string[] | undefined =>
    typeof knownSecrets === 'function' ? knownSecrets() : knownCopy;
  const tmpRoot = os.tmpdir();
  const out = stderr ? console.error : console.log;
  const errorColor = colors.error ?? identity;
  const warnColor = colors.warn ?? identity;
  const infoColor = colors.info ?? identity;
  const debugColor = colors.debug ?? identity;

  return {
    // Let handler control visibility: pass everything through. With the gate
    // at DEBUG, ERROR always reaches the handler (and the ring) even without
    // --verbose.
    level: Level.DEBUG,
    handler: (level, message, context, scope) => {
      // Build formatted message
      const scopePath = scope.length > 0 ? `[${scope.join(':')}] ` : '';
      // Serialize the structured context into the line so error details (gRPC
      // status codes, row counts, target tables) reach stderr and the ring.
      // Serialization happens BEFORE scrubSecrets so redaction covers context
      // values too; the heartbeat path's 256-char cap stays as the wire
      // backstop. A context that cannot stringify (circular) must never break
      // logging.
      let meta = '';
      if (Object.keys(context).length > 0) {
        try {
          meta = ` ${JSON.stringify(context)}`;
        } catch {
          meta = ' [unserializable context]';
        }
      }
      // Redact secrets ONCE here, before BOTH the onLine ring tap and the
      // console.* output. stderr is shipped directly by the log collector, so
      // the heartbeat-egress redactor alone would miss it; doing it in the
      // handler scrubs every line routed through this logger (collector and
      // steps) on both paths. Length is preserved here (no truncation); the
      // heartbeat path applies the 256-char wire cap separately as a backstop
      // on already-redacted text.
      // Order: known values first, so the label can never split one (a
      // `sqlite:/tmp/...` URL, or a value that only touches the root at its
      // edge); then the temp root label, since a long per-user root (macOS
      // `/var/folders/...`) would otherwise read as a token; then the
      // pattern rules.
      const fullMessage = scrubSecrets(
        labelTmpRoot(
          maskKnownValues(`${scopePath}${message}${meta}`, readKnown()),
          tmpRoot,
        ),
      );

      // Tap every line before any early return so no level is dropped from capture.
      try {
        options.onLine?.(level, fullMessage);
      } catch {
        // Swallow: a throwing consumer must never break logging (and we must
        // not call logger methods here to avoid infinite recursion).
      }

      // ERROR: always shown unless json mode
      if (level === Level.ERROR) {
        if (!json) console.error(errorColor(fullMessage));
        return;
      }

      // Non-errors suppressed in silent or json mode
      if (silent || json) return;

      // DEBUG: only with verbose
      if (level === Level.DEBUG) {
        if (!verbose) return;
        out(`  ${debugColor(fullMessage)}`);
        return;
      }

      // WARN / INFO: normal output
      out(
        level === Level.WARN ? warnColor(fullMessage) : infoColor(fullMessage),
      );
    },
    jsonHandler: (data) => {
      if (!silent) out(JSON.stringify(data, null, 2));
    },
  };
}

/**
 * Create a core Logger.Instance with terminal-appropriate behavior.
 *
 * Behavior:
 * - ERROR: always shown (via console.error, `colors.error`) unless --json
 * - WARN: shown unless --silent or --json
 * - INFO: shown unless --silent or --json
 * - DEBUG: shown only with --verbose (and not --silent/--json)
 * - json(): shown unless --silent
 */
export function createCLILogger(
  options: CLILoggerOptions = {},
  colors: CLILoggerColors = {},
): Instance {
  return createLogger(createCLILoggerConfig(options, colors));
}
