import type { PushFn } from './types';

export const push: PushFn = async function (events, config) {
  return { queue: [] };
};
