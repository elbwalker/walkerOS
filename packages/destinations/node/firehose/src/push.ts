import type { Config, PushEvents } from './types';

export const push = async function (events: PushEvents, config: Config) {
  console.log('🚀 ~ push ~ events:', events, config);
  return { queue: [] };
};
