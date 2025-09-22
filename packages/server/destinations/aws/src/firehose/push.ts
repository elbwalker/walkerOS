import type { PushFn } from './types';
import { pushFirehose } from './lib/firehose';

export const push: PushFn = async function (event, { config, collector, env }) {
  const { firehose } = config.settings || {};

  if (firehose) pushFirehose([{ event }], firehose, env);

  return;
};
