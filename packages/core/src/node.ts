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
import {
  asCompiled,
  maskKnownValues,
  scrubSecrets,
  type CompiledKnown,
  type KnownValues,
} from './redactLine';
import { knownNumberForms, maskKnownNumbers } from './node/scrubJson';

export {
  compileKnown,
  createKnownValues,
  cutLine,
  maskKnownValues,
  redactLine,
  scrubSecrets,
} from './redactLine';
export type { CompiledKnown, KnownValues, ScrubOptions } from './redactLine';
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
 * One log line as a structured entry: the shape a JSON line prints and
 * `TappedLine.entry()` returns, masked like the text line. `message` is
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

/**
 * One line as the `onLine` tap receives it. It is masked when first read, at
 * most once per known set: a line nobody prints or reads is never masked, and
 * a line read after the set grew is masked again with the new values. Its
 * unmasked text stays inside the object, captured as text when it was
 * logged, so a later change to the logged context does not reach it.
 */
export interface TappedLine {
  readonly level: Level;
  /** When the line was logged, in ms since the epoch. */
  readonly time: number;
  /** The masked text line. Never throws. */
  masked(): string;
  /** The masked structured entry, built when read. Never throws. */
  entry(): LogEntry;
}

/** What a line shows when masking it throws: never its unmasked text. */
const MASK_FAILED = '[line not shown: masking failed]';
const UNSERIALIZABLE = '[unserializable context]';

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
   * Taps every ERROR, WARN and INFO line before any visibility gate, and a
   * DEBUG line only with `verbose`: the masked text line and the same line
   * as a structured entry (scope, and the context with fields such as code,
   * status, retryable and suppressed), each masked when read.
   */
  onLine?: (level: Level, line: TappedLine) => void;
  /**
   * Exact secret values masked in every line (see `scrubSecrets`). An array is
   * compiled at creation; a `KnownValues` is read per line, so values learned
   * after the logger exists (secrets fetched at startup) are masked too.
   */
  knownSecrets?: readonly string[] | KnownValues;
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

/** A line's message and context JSON, masked with one compiled set. */
interface MaskedParts {
  compiled: CompiledKnown;
  /** `[scope] message`, masked. */
  message: string;
  /** The context JSON, masked; absent when the line has no context. */
  context?: string;
}

/**
 * The structured entry of one line and its JSON text, built from its masked
 * parts. A context that could not serialize, or whose masked form no longer
 * parses, becomes `"[unserializable context]"`. A line above
 * {@link MAX_JSON_LINE_BYTES} keeps a prefix of its masked message (when that
 * is above half the cap) and of its masked context JSON, so a cut never
 * splits a secret.
 */
function buildLogEntry(
  level: Level,
  scopeName: string,
  parts: MaskedParts,
  unserializable: boolean,
  time: number,
): { entry: LogEntry; line: string } {
  const entry: LogEntry = {
    severity: SEVERITY[level],
    message: parts.message,
    time: new Date(time).toISOString(),
  };
  if (scopeName) entry.scope = scopeName;

  let contextJson = parts.context;
  if (unserializable) entry.context = UNSERIALIZABLE;
  else if (contextJson !== undefined) {
    try {
      const parsed: unknown = JSON.parse(contextJson);
      entry.context = isRecord(parsed) ? parsed : UNSERIALIZABLE;
    } catch {
      contextJson = undefined;
      entry.context = UNSERIALIZABLE;
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

/** Masks a text with one compiled set, in the text line's order. */
type Masker = (text: string, compiled: CompiledKnown) => string;

interface LoggedLine {
  line: TappedLine;
  /** The JSON console line, from the same masked parts. Never throws. */
  json(): string;
  /** Ends the handler call: a read after it checks the known set again. */
  settle(): void;
}

/**
 * Capture one line as text at log time and mask it lazily. The masked parts
 * are kept with the compiled set they used; a read after the handler call
 * masks again only when the set changed. Within the handler call the set is
 * read once, so printing and tapping a line masks it once.
 */
function logLine(
  level: Level,
  message: string,
  context: LogContext,
  scope: string[],
  readCompiled: () => CompiledKnown,
  mask: Masker,
): LoggedLine {
  const time = Date.now();
  const scopeName = scope.join(':');
  const scoped = `${scopeName ? `[${scopeName}] ` : ''}${message}`;
  // The context is kept as its JSON text only: the object may be a live
  // event or response that changes or holds memory after this call.
  let rawContext: string | undefined;
  let unserializable = false;
  if (Object.keys(context).length > 0) {
    try {
      rawContext = JSON.stringify(context);
    } catch {
      unserializable = true;
    }
  }

  let inCall = true;
  let parts: MaskedParts | undefined;
  let built: { parts: MaskedParts; entry: LogEntry; line: string } | undefined;

  const maskParts = (): MaskedParts => {
    if (parts && inCall) return parts;
    const compiled = readCompiled();
    if (parts && parts.compiled === compiled) return parts;
    let maskedContext: string | undefined;
    if (rawContext !== undefined) {
      // A number that prints a known value becomes "***" before the known
      // pass, which would otherwise leave an unquoted *** in the JSON.
      const json =
        knownNumberForms(compiled).length > 0
          ? JSON.stringify(maskKnownNumbers(JSON.parse(rawContext), compiled))
          : rawContext;
      maskedContext = mask(json, compiled);
    }
    parts = { compiled, message: mask(scoped, compiled) };
    if (maskedContext !== undefined) parts.context = maskedContext;
    return parts;
  };

  const build = (): { entry: LogEntry; line: string } => {
    const current = maskParts();
    if (!built || built.parts !== current)
      built = {
        parts: current,
        ...buildLogEntry(level, scopeName, current, unserializable, time),
      };
    return built;
  };

  const failedEntry = (): LogEntry => ({
    severity: SEVERITY[level],
    message: MASK_FAILED,
    time: new Date(time).toISOString(),
  });

  return {
    line: {
      level,
      time,
      masked: () => {
        try {
          const current = maskParts();
          if (current.context !== undefined)
            return `${current.message} ${current.context}`;
          return unserializable
            ? `${current.message} ${UNSERIALIZABLE}`
            : current.message;
        } catch {
          return MASK_FAILED;
        }
      },
      entry: () => {
        try {
          return build().entry;
        } catch {
          return failedEntry();
        }
      },
    },
    json: () => {
      try {
        return build().line;
      } catch {
        return JSON.stringify(failedEntry());
      }
    },
    settle: () => {
      inCall = false;
    },
  };
}

/** The compiled set a logger masks with: read per line for a `KnownValues`. */
function knownReader(
  known: readonly string[] | KnownValues | undefined,
): () => CompiledKnown {
  if (known && 'compiled' in known) return () => known.compiled();
  const fixed = asCompiled(known);
  return () => fixed;
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
  const readCompiled = knownReader(knownSecrets);
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
  // The masking order of every line: known values first, so the label can
  // never split one (a `sqlite:/tmp/...` URL, or a value that only touches
  // the root at its edge); then the temp root label, since a long per-user
  // root (macOS `/var/folders/...`) would otherwise read as a token; then the
  // pattern rules. Masking runs here, in the handler, for the console and
  // the tap alike: stderr is shipped directly by the log collector, so no
  // later egress step may be the only one that masks a line.
  const mask: Masker = (text, compiled) =>
    scrubSecrets(labelTmpRoot(maskKnownValues(text, compiled), tmpRoot));

  return {
    // Let handler control visibility: pass everything through. With the gate
    // at DEBUG, ERROR always reaches the handler (and the ring) even without
    // --verbose.
    level: Level.DEBUG,
    handler: (level, message, context, scope) => {
      // Machine output (`json`) prints only its result; silent keeps errors;
      // DEBUG needs verbose, for the console and the tap alike. A line nobody
      // prints and no tap reads costs nothing more: it returns before the
      // line is captured.
      const debugOpen = level !== Level.DEBUG || readVerbose();
      const shown = !json && (level === Level.ERROR || !silent) && debugOpen;
      const tap = debugOpen ? options.onLine : undefined;
      if (!shown && !tap) return;

      // The structured context is serialized into the line so error details
      // (gRPC status codes, row counts, target tables) reach stderr and the
      // ring; a context that cannot stringify (circular) never breaks
      // logging. The line masks itself when read, at most once here.
      const logged = logLine(
        level,
        message,
        context,
        scope,
        readCompiled,
        mask,
      );
      try {
        // The tap reads every line it is open for, before the console gate,
        // so ERROR, WARN and INFO reach it even when nothing prints.
        if (tap) {
          try {
            tap(level, logged.line);
          } catch {
            // Swallow: a throwing consumer must never break logging (and we
            // must not call logger methods here to avoid infinite recursion).
          }
        }

        if (!shown) return;

        // JSON lines: one object per line, no colour; ERROR and WARN on
        // stderr (where platforms that ship only stderr still see them), INFO
        // and DEBUG on stdout.
        if (readFormat() === 'json') {
          if (level === Level.ERROR || level === Level.WARN)
            console.error(logged.json());
          else out(logged.json());
          return;
        }

        const text = logged.line.masked();
        if (level === Level.ERROR) console.error(errorColor(text));
        else if (level === Level.DEBUG) out(`  ${debugColor(text)}`);
        else out(level === Level.WARN ? warnColor(text) : infoColor(text));
      } finally {
        logged.settle();
      }
    },
    jsonHandler: (data) => {
      if (!silent) out(JSON.stringify(data, null, 2));
    },
    // A logger built from this config masks the same known values in text
    // that leaves outside a line; the handler above masks the lines.
    mask: (text) => maskKnownValues(text, readCompiled()),
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
