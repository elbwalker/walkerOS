import type { WalkerOS } from '@elbwalker/types';
import type { PushFn } from './types';

export const push: PushFn = async function (event, config, mapping) {
  console.log('push', event, config, mapping);
};
