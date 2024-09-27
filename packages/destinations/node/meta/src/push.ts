import type { Config, PushEvents } from './types';

export const push = async function (events: PushEvents, config: Config) {
  events;
  config;

  return { queue: [] };
};
