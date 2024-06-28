import type { WalkerOS } from '@elbwalker/types';
import type { NodeClient } from '../types';
import { Const, assign, isSameType } from '@elbwalker/utils';

export function createResult(
  partialResult?: Partial<NodeClient.PushResult>,
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

export function isCommand(entity: string) {
  return entity === Const.Commands.Walker;
}

export function isObject(obj: unknown): obj is WalkerOS.AnyObject {
  return isSameType(obj, {}) && !Array.isArray(obj) && obj !== null;
}
