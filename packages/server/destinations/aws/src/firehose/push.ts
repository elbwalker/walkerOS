import type { PushFn } from './types';
import { pushFirehose } from './lib/firehose';

export const push: PushFn = async function (event, context) {
  const { firehose } = context.config.settings || {};

  if (firehose) pushFirehose([{ event }], firehose, context);

  return;
};
