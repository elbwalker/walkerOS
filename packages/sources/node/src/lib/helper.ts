import type { Elb } from '../types';
import { Const, assign } from '@elbwalker/utils';

export function createResult(
  partialResult?: Partial<Elb.PushResult>,
): Elb.PushResult {
  const result: Elb.PushResult = assign(
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
