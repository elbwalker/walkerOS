import type { Config, PushEvents } from './types';
import { pushFirehose } from './lib/firehose';

export const push = async function (events: PushEvents, config: Config) {
  const { firehose } = config.custom;

  if (firehose) pushFirehose(events, firehose);

  return { queue: [] }; // @TODO
};
