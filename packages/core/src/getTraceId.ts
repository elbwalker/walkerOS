import { hexId } from './hexId';

/**
 * W3C trace_id: 16 random bytes encoded as 32 lowercase hex characters.
 * Shared by every event of a collector run. Reference: W3C Trace Context.
 */
export function getTraceId(): string {
  return hexId(32);
}
