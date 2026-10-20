import type { Collector } from './types';
import { capMessage } from './stepError';
import { isObject } from './is';

/** What a failure line is about: the step, the cause code and the HTTP status. */
export interface CauseKey {
  step: string;
  code: string;
  status?: number;
}

/** Where cause lines go; `Logger.Instance` fits, and so does a test recorder. */
export interface CauseLogger {
  error(message: string, context: Record<string, unknown>): void;
  warn(message: string, context: Record<string, unknown>): void;
}

/**
 * One line per cause: the first occurrence of a key is logged at once,
 * repeats within the window are counted and printed as `suppressed: <n>`
 * with the next line of that key or at `flush`.
 */
export interface CauseLog {
  report(
    key: CauseKey,
    message: string,
    context: Record<string, unknown>,
    level?: 'error' | 'warn',
  ): void;
  /** Print the pending `suppressed` counts (server shutdown). */
  flush(): void;
  /** Number of keys held. */
  size(): number;
}

export interface CauseLogOptions {
  windowMs?: number;
  maxKeys?: number;
  now?: () => number;
}

interface CauseEntry {
  start: number;
  suppressed: number;
  message: string;
  context: Record<string, unknown>;
  level: 'error' | 'warn';
}

/**
 * Context keys a cause line may carry besides the key's own fields. Never
 * event payloads, ingest values, response bodies, settings or `Error.cause`.
 */
const STRING_KEYS = ['type', 'mappingKey'] as const;
const NUMBER_KEYS = ['count', 'suppressed'] as const;

/**
 * The counter a cause's occurrences are counted in, named by its first line:
 * from the step id (`destination.<id>`: its `failed`; rejected input at
 * `source.<id>`: its `rejected`; otherwise `status.failed`), except for the
 * causes that are counted as drops or not at all.
 */
function counterOf({ step, code }: CauseKey): string | undefined {
  const [kind, ...rest] = step.split('.');
  const id = rest.join('.');
  // Evicted entries: the DLQ's were counted failed already, the queue's
  // were never delivered; both are counted with the step's drops.
  if (code === 'dlq-overflow') return `status.dropped["${step}"].dlq`;
  if (code === 'on-overflow') return `status.dropped["${step}"].queue`;
  // A failed on(consent) holds the destination; its events are reported
  // when they fail.
  if (code === 'consent-not-applied') return undefined;
  // A failed store read or a dropped mapping value degrades an event that is
  // still delivered: nothing counts it.
  if (kind === 'store' || kind === 'mapping') return undefined;
  if (kind === 'destination' && id) return `status.destinations.${id}.failed`;
  if (code === 'invalid')
    return kind === 'source' && id
      ? `status.sources.${id}.rejected`
      : undefined;
  return 'status.failed';
}

/** An error-ish value as a capped message. */
function errorText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return capMessage(value);
  if (value instanceof Error) return capMessage(value.message);
  if (isObject(value) && typeof value.message === 'string')
    return capMessage(value.message);
  return capMessage(String(value));
}

/** An `event` value reduced to its name. */
function eventName(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (isObject(value) && typeof value.name === 'string') return value.name;
  return undefined;
}

/**
 * The context a cause line carries: the key's fields plus the allowed keys
 * of the given context. Everything else is dropped.
 */
export function causeContext(
  key: CauseKey,
  context: Record<string, unknown>,
): Record<string, unknown> {
  const line: Record<string, unknown> = { step: key.step, code: key.code };
  if (key.status !== undefined) line.status = key.status;
  for (const name of STRING_KEYS) {
    if (typeof context[name] === 'string') line[name] = context[name];
  }
  for (const name of NUMBER_KEYS) {
    if (typeof context[name] === 'number') line[name] = context[name];
  }
  if (typeof context.retryable === 'boolean')
    line.retryable = context.retryable;
  const event = eventName(context.event);
  if (event !== undefined) line.event = event;
  const error = errorText(context.error);
  if (error !== undefined) line.error = error;
  return line;
}

/** The first line of a cause names the counter its repeats are counted in. */
function firstLine(key: CauseKey, message: string): string {
  const counter = counterOf(key);
  return counter
    ? `${message} (repeats within a minute are counted in ${counter})`
    : message;
}

/**
 * Creates the cause log of one collector. Rate limit per (step, code,
 * status): one line per window, repeats counted. At most `maxKeys` keys are
 * held; a key beyond the cap is logged on every occurrence, never dropped
 * and never suppressed. No timers: windows are checked on report.
 */
export function createCauseLog(
  logger: CauseLogger,
  options: CauseLogOptions = {},
): CauseLog {
  const { windowMs = 60_000, maxKeys = 100, now = Date.now } = options;
  const entries = new Map<string, CauseEntry>();

  const write = (
    level: 'error' | 'warn',
    message: string,
    context: Record<string, unknown>,
  ): void => {
    if (level === 'warn') logger.warn(message, context);
    else logger.error(message, context);
  };

  return {
    report(key, message, context, level = 'error') {
      const id = `${key.step}\u0000${key.code}\u0000${key.status ?? ''}`;
      const line = causeContext(key, context);
      const entry = entries.get(id);
      const at = now();

      if (!entry) {
        if (entries.size < maxKeys) {
          entries.set(id, {
            start: at,
            suppressed: 0,
            message,
            context: line,
            level,
          });
        }
        write(level, firstLine(key, message), line);
        return;
      }

      if (at - entry.start < windowMs) {
        entry.suppressed++;
        return;
      }

      const suppressed = entry.suppressed;
      entry.start = at;
      entry.suppressed = 0;
      entry.message = message;
      entry.context = line;
      entry.level = level;
      write(
        level,
        firstLine(key, message),
        suppressed > 0 ? { ...line, suppressed } : line,
      );
    },

    flush() {
      for (const entry of entries.values()) {
        if (entry.suppressed === 0) continue;
        const suppressed = entry.suppressed;
        entry.suppressed = 0;
        write(entry.level, entry.message, { ...entry.context, suppressed });
      }
    },

    size() {
      return entries.size;
    },
  };
}

/**
 * The one entry for every failure line: through the collector's cause log,
 * or, without one (a hand-built collector), one filtered line through
 * `logger`.
 */
export function reportCause(
  collector: Collector.Instance | undefined,
  logger: CauseLogger,
  key: CauseKey,
  message: string,
  context: Record<string, unknown>,
  level: 'error' | 'warn' = 'error',
): void {
  if (collector?.causeLog) {
    collector.causeLog.report(key, message, context, level);
    return;
  }
  const line = causeContext(key, context);
  if (level === 'warn') logger.warn(message, line);
  else logger.error(message, line);
}
