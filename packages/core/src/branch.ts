import type { Transformer, WalkerOS } from './types';

/**
 * Creates a TransformerResult for dynamic chain routing.
 * Use this in transformer push functions to redirect the chain.
 */
export function branch(
  event: WalkerOS.DeepPartialEvent,
  next: Transformer.Next,
): Transformer.Result {
  return { event, next };
}
