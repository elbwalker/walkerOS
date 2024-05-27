import { assign } from '@elbwalker/utils';
import type { NodeClient } from './types';

export function createResult(
  partialResult: Partial<NodeClient.PushResult>,
): NodeClient.PushResult {
  const result: NodeClient.PushResult = assign(
    {
      successful: [],
      queued: [],
      failed: [],
      status: { ok: false },
    },
    partialResult,
  );

  // Check if some destinations failed
  result.status.ok = result.failed.length === 0;

  return result;
}
