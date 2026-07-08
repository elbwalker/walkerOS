export interface ParsedTraceparent {
  /** W3C 32-hex trace id. */
  trace: string;
  /** W3C 16-hex parent span id (upstream event id). */
  parentSpan: string;
}

// Exactly four dash-separated segments: 2-hex version, 32-hex trace,
// 16-hex span, 2-hex flags. Lowercase only, per the W3C Trace Context spec.
const TRACEPARENT =
  /^(?<version>[0-9a-f]{2})-(?<trace>[0-9a-f]{32})-(?<span>[0-9a-f]{16})-[0-9a-f]{2}$/;

/**
 * Parse a W3C `traceparent` header value (`00-<32hex>-<16hex>-<2hex>`).
 * Returns undefined on any mismatch, and never throws. Rejects a non-string
 * input, wrong segment count, malformed segment lengths, uppercase hex, the
 * reserved `ff` version, an all-zero trace, and an all-zero span. Any other
 * 2-hex version is accepted for forward compatibility with future spec
 * revisions.
 */
export function parseTraceparent(
  value: unknown,
): ParsedTraceparent | undefined {
  if (typeof value !== 'string') return undefined;

  const groups = TRACEPARENT.exec(value)?.groups;
  if (!groups) return undefined;

  const { version, trace, span } = groups;
  if (version === undefined || trace === undefined || span === undefined)
    return undefined;

  // Reserved/invalid values the regex cannot express directly.
  if (version === 'ff') return undefined;
  if (/^0+$/.test(trace) || /^0+$/.test(span)) return undefined;

  return { trace, parentSpan: span };
}
