import type {
  DedupedError,
  RingEntry,
  RecentError,
  RecentLogEntry,
} from './log-ring.js';
import {
  cutLine,
  maskKnownValues,
  type CompiledKnown,
} from '@walkeros/core/node';

// The redactor lives in `@walkeros/core/node` beside the logger handler (used
// by this runtime and the CLI), so the handler and this heartbeat path share
// one set of patterns. The handler masks every line; the heartbeat only cuts
// it to the 256-char wire cap.
export { redactLine, scrubSecrets } from '@walkeros/core/node';

/**
 * The error ring's entries for the wire: each message, masked when it was
 * stored, masked again with the known values (a value learned after the
 * error was stored), then cut to 256 characters. Timestamps become ISO-8601.
 */
export function redactErrors(
  errors: DedupedError[],
  known?: CompiledKnown,
): RecentError[] {
  return errors.map((e) => ({
    message: cutLine(maskKnownValues(e.message, known)),
    count: e.count,
    firstSeen: new Date(e.firstSeen).toISOString(),
    lastSeen: new Date(e.lastSeen).toISOString(),
  }));
}

/**
 * The log ring's entries for the wire: each line masked as it is read, with
 * the known values of now, then cut to 256 characters. Timestamps become
 * ISO-8601.
 */
export function redactLogs(entries: RingEntry[]): RecentLogEntry[] {
  return entries.map((e) => ({
    time: new Date(e.time).toISOString(),
    level: e.level,
    message: cutLine(e.line.masked()),
  }));
}
