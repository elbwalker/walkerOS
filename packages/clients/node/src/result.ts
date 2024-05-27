import { assign } from '@elbwalker/utils';
import type { NodeClient } from './types';

export function createResult(
  partialResult: Partial<NodeClient.PushResult>,
): NodeClient.PushResult {
  const defaultResult: NodeClient.PushResult = {
    successful: [],
    queued: [],
    failed: [],
    status: { ok: false },
  };

  return assign(defaultResult, partialResult);
}
