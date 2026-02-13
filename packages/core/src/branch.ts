import type { Transformer, WalkerOS } from './types';

/**
 * Creates a BranchResult for dynamic chain routing.
 * Use this in transformer push functions to redirect the chain.
 */
export function branch(
  event: WalkerOS.DeepPartialEvent,
  next: Transformer.Next,
): Transformer.BranchResult {
  return { __branch: true, event, next };
}
