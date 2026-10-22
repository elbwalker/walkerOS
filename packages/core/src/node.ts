/**
 * Node entry point (`@walkeros/core/node`).
 *
 * Helpers shared by `@walkeros/cli`, `@walkeros/runner` and the server stores
 * that do not belong in the browser `.` entry: the temp-path helpers import
 * node builtins, the terminal logger config writes to the console, and the
 * secret redactor, the simulate output formatter (`toPrintable`) and the store
 * byte codec (both read `Buffer`) have no browser consumer. Core gains no
 * dependency for them: the colouriser is injected by the caller, so chalk
 * stays in the packages that already depend on it.
 */

/* eslint-disable no-console */
import os from 'os';
import path from 'path';
import { createLogger } from './logger';
import { maskKnownValues, scrubSecrets } from './redactLine';
import { maskKnownNumbers } from './node/scrubJson';

export { scrubSecrets, redactLine } from './redactLine';
export type { ScrubOptions } from './redactLine';
export { scrubJson } from './node/scrubJson';
export { toPrintable } from './node/toPrintable';
export {
  serializeStoreValue,
  deserializeStoreValue,
  StoreCodecError,
} from './node/storeCodec';
import type { Config, Format, Instance, LogContext } from './types/logger';
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

/**
 * One log line as a structured entry: the shape a JSON line prints and the
 * `onLine` tap receives, masked like the text line. `message` is
 * `[scope] message` without the context; `scope` and `context` are omitted
 * when empty. When the line would pass {@link MAX_JSON_LINE_BYTES}, a
 * message above half the cap keeps a prefix (`messageTruncated`), then
 * `context` becomes a string prefix of its JSON (`contextTruncated`).
 */
export interface LogEntry {
  severity: 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
  message: string;
  messageTruncated?: true;
  scope?: string;
  context?: Record<string, unknown> | string;
  contextTruncated?: true;
  time: string;
}

/**
 * Size cap of one JSON line, far below the 256 KiB a log platform accepts
 * per entry: a longer entry may be dropped whole rather than cut.
 */
export const MAX_JSON_LINE_BYTES = 32 * 1024;

export interface CLILoggerOptions {
  /**
   * Opens the DEBUG gate. A function is read per line, so a host can open
   * it for the level a flow sets once it knows it.
   */
  verbose?: boolean | (() => boolean);
  silent?: boolean;
  json?: boolean;
  stderr?: boolean;
  /**
   * Taps every line before any visibility gate: the masked text line, and
   * the same line as a structured entry (scope, and the context with fields
   * such as code, status, retryable and suppressed) for forwarding.
   */
  onLine?: (level: Level, message: string, entry: LogEntry) => void;
  /**
   * Exact secret values masked in every line (see `scrubSecrets`). An array is
   * copied at creation; a function is read per line, so values learned after
   * the logger exists (secrets fetched at startup) are masked too.
   */
  knownSecrets?: readonly string[] | (() => readonly string[]);
  /**
   * Output format (`text` by default): `json` prints one JSON object per
   * line, ERROR and WARN to stderr, INFO and DEBUG to stdout, without
   * colour. A function is read per line, so a host can switch to the
   * format a flow sets once it knows it. `json` (machine output) wins.
   */
  format?: Format | (() => Format | undefined);
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

const SEVERITY: Record<Level, LogEntry['severity']> = {
  [Level.ERROR]: 'ERROR',
  [Level.WARN]: 'WARNING',
  [Level.INFO]: 'INFO',
  [Level.DEBUG]: 'DEBUG',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The structured entry of one line and its JSON text, masked in the text
 * line's order: numbers that print a known value become `'***'` before
 * serializing (masking inside serialized JSON would break it), then known
 * values, the temp root label and the pattern rules, applied to the message
 * and to the serialized context. A context that cannot serialize, or whose
 * masked form no longer parses, becomes `"[unserializable context]"`. A
 * line above {@link MAX_JSON_LINE_BYTES} keeps a prefix of its masked
 * message (when that is above half the cap) and of its masked context JSON,
 * so a cut never splits a secret.
 */
function buildLogEntry(
  level: Level,
  message: string,
  context: LogContext,
  scope: string[],
  mask: (text: string) => string,
  known: readonly string[] | undefined,
): { entry: LogEntry; line: string } {
  const scopeName = scope.join(':');
  const entry: LogEntry = {
    severity: SEVERITY[level],
    message: mask(`${scopeName ? `[${scopeName}] ` : ''}${message}`),
    time: new Date().toISOString(),
  };
  if (scopeName) entry.scope = scopeName;

  let contextJson: string | undefined;
  if (Object.keys(context).length > 0) {
    try {
      contextJson = mask(
        JSON.stringify(maskKnownNumbers(context, known ?? [])),
      );
      const parsed: unknown = JSON.parse(contextJson);
      entry.context = isRecord(parsed) ? parsed : '[unserializable context]';
    } catch {
      contextJson = undefined;
      entry.context = '[unserializable context]';
    }
  }

  let line = JSON.stringify(entry);
  if (Buffer.byteLength(line) <= MAX_JSON_LINE_BYTES) return { entry, line };

  // The message keeps at most half the cap, the context the rest.
  const half = MAX_JSON_LINE_BYTES / 2;
  if (Buffer.byteLength(entry.message) > half) {
    const message = entry.message;
    let size = half;
    do {
      entry.message = message.slice(0, size);
      size = Math.floor(size / 2);
    } while (Buffer.byteLength(entry.message) > half && size > 0);
    entry.messageTruncated = true;
    line = JSON.stringify(entry);
  }
  if (contextJson && Buffer.byteLength(line) > MAX_JSON_LINE_BYTES) {
    entry.contextTruncated = true;
    let size = MAX_JSON_LINE_BYTES - Buffer.byteLength(entry.message) - 256;
    do {
      entry.context = contextJson.slice(0, Math.max(size, 0));
      line = JSON.stringify(entry);
      size = Math.floor(size / 2);
    } while (Buffer.byteLength(line) > MAX_JSON_LINE_BYTES && size > 0);
  }
  return { entry, line };
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
    format,
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

  const readFormat = (): Format =>
    (typeof format === 'function' ? format() : format) ?? 'text';
  const readVerbose = (): boolean =>
    typeof verbose === 'function' ? verbose() : verbose;
  // The text line's masking order, shared by the JSON entry: known values
  // first, so the label can never split one; then the temp root label; then
  // the pattern rules.
  const mask = (text: string): string =>
    scrubSecrets(labelTmpRoot(maskKnownValues(text, readKnown()), tmpRoot));

  return {
    // Let handler control visibility: pass everything through. With the gate
    // at DEBUG, ERROR always reaches the handler (and the ring) even without
    // --verbose.
    level: Level.DEBUG,
    handler: (level, message, context, scope) => {
      // Machine output (`json`) prints only its result; silent keeps errors;
      // DEBUG needs verbose. A line nobody prints and no tap reads costs
      // nothing more.
      const shown =
        !json &&
        (level === Level.ERROR || !silent) &&
        (level !== Level.DEBUG || readVerbose());
      const tap = options.onLine;
      if (!shown && !tap) return;
      const asJson = shown && readFormat() === 'json';

      // Build formatted message
      const scopePath = scope.length > 0 ? `[${scope.join(':')}] ` : '';
      // Serialize the structured context into the line so error details (gRPC
      // status codes, row counts, target tables) reach stderr and the ring.
      // Serialization happens BEFORE scrubSecrets so redaction covers context
      // values too; the heartbeat path's 256-char cap stays as the wire
      // backstop. A context that cannot stringify (circular) must never break
      // logging.
      const textLine = (): string => {
        let meta = '';
        if (Object.keys(context).length > 0) {
          try {
            meta = ` ${JSON.stringify(context)}`;
          } catch {
            meta = ' [unserializable context]';
          }
        }
        // Redact secrets ONCE here, before BOTH the onLine ring tap and the
        // console.* output. stderr is shipped directly by the log collector,
        // so the heartbeat-egress redactor alone would miss it; doing it in
        // the handler scrubs every line routed through this logger (collector
        // and steps) on both paths. Length is preserved here (no truncation);
        // the heartbeat path applies the 256-char wire cap separately as a
        // backstop on already-redacted text.
        // Order: known values first, so the label can never split one (a
        // `sqlite:/tmp/...` URL, or a value that only touches the root at its
        // edge); then the temp root label, since a long per-user root (macOS
        // `/var/folders/...`) would otherwise read as a token; then the
        // pattern rules.
        return mask(`${scopePath}${message}${meta}`);
      };
      // The structured entry only where it is used: a JSON line, or the tap.
      const built =
        asJson || tap
          ? buildLogEntry(level, message, context, scope, mask, readKnown())
          : undefined;
      const fullMessage = tap || !asJson ? textLine() : '';

      // Tap every line before the gate so no level is dropped from capture.
      if (tap && built) {
        try {
          tap(level, fullMessage, built.entry);
        } catch {
          // Swallow: a throwing consumer must never break logging (and we
          // must not call logger methods here to avoid infinite recursion).
        }
      }

      if (!shown) return;

      // JSON lines: one object per line, no colour; ERROR and WARN on stderr
      // (where platforms that ship only stderr still see them), INFO and
      // DEBUG on stdout.
      if (asJson && built) {
        if (level === Level.ERROR || level === Level.WARN)
          console.error(built.line);
        else out(built.line);
        return;
      }

      if (level === Level.ERROR) console.error(errorColor(fullMessage));
      else if (level === Level.DEBUG) out(`  ${debugColor(fullMessage)}`);
      else
        out(
          level === Level.WARN
            ? warnColor(fullMessage)
            : infoColor(fullMessage),
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
