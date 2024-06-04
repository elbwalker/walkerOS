import { WalkerOS } from '@elbwalker/types';

export function maybeAwait<P extends unknown[], R>(
  fn: (...args: P) => WalkerOS.MaybePromise<R>,
  isAsync = false,
): (...args: P) => WalkerOS.MaybePromise<R> {
  if (isAsync)
    return async function (...args: P) {
      return await fn(...args);
    };

  return function (...args: P) {
    return fn(...args);
  };
}
