import { isObject } from '@walkeros/core';

/**
 * Matomo's bulk answer: its counts `{ status, tracked, invalid }`;
 * `'unconfirmed'` for the core tracker answer QueuedTracking gives instead
 * (an empty body, or its 1x1 GIF), which carries no counts; undefined for
 * anything else, which is not Matomo's tracker.
 */
export function bulkAnswerOf(
  data: unknown,
): { tracked: number; invalid: number } | 'unconfirmed' | undefined {
  if (
    data === undefined ||
    data === '' ||
    (typeof data === 'string' && data.startsWith('GIF8'))
  )
    return 'unconfirmed';
  if (
    isObject(data) &&
    typeof data.status === 'string' &&
    typeof data.tracked === 'number' &&
    typeof data.invalid === 'number'
  )
    return { tracked: data.tracked, invalid: data.invalid };
  return undefined;
}
