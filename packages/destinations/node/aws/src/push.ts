import type { PushFn } from './types';
import { pushFirehose } from './lib/firehose';

export const push: PushFn = async function (event, config) {
  const { firehose } = config.custom || {};

  if (firehose) pushFirehose([{ event }], firehose);

  return { queue: [] }; // @TODO
};
