import type {
  DedupedError,
  RingEntry,
  RecentError,
  RecentLogEntry,
} from './log-ring.js';
import { redactLine } from '../core/redact-line.js';

// The redactor lives in a neutral core module so the CLI logger handler
// (core/cli-logger.ts) and this heartbeat path share one set of patterns.
// `redactLine` here is the truncating wire variant (256-char heartbeat cap).
// The handler already scrubs secrets before they enter the ring, so applying
// `redactLine` to the snapshot is a cheap backstop on already-redacted text
// plus the wire-length truncation.
export { redactLine, scrubSecrets } from '../core/redact-line.js';

/**
 * Map an array of DedupedError entries through redactLine,
 * converting numeric timestamps to ISO-8601 strings.
 */
export function redactErrors(errors: DedupedError[]): RecentError[] {
  return errors.map((e) => ({
    message: redactLine(e.message),
    count: e.count,
    firstSeen: new Date(e.firstSeen).toISOString(),
    lastSeen: new Date(e.lastSeen).toISOString(),
  }));
}

/**
 * Map an array of RingEntry log entries through redactLine,
 * converting numeric timestamps to ISO-8601 strings.
 */
export function redactLogs(entries: RingEntry[]): RecentLogEntry[] {
  return entries.map((e) => ({
    time: new Date(e.time).toISOString(),
    level: e.level,
    message: redactLine(e.message),
  }));
}
