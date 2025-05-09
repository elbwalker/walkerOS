import type { WalkerOS } from '@elbwalker/types';
import type { PushFn } from './types';
import { isObject, isArray } from '@elbwalker/utils';

export const push: PushFn = async function (event, config, mapping, options) {
  const { client, datasetId, tableId } = config.custom!;

  let row: WalkerOS.AnyObject | undefined;

  if (isObject(options?.data)) {
    row = options.data;
  } else {
    const now = new Date();
    row = {
      ...event,
      timestamp: event.timestamp ? new Date(event.timestamp) : now,
      createdAt: now,
    };
  }

  const rows = [mapEvent(row)];

  await client.dataset(datasetId).table(tableId).insert(rows);

  return;
};

export const mapEvent = (event: WalkerOS.AnyObject) => {
  return Object.entries(event).reduce<WalkerOS.AnyObject>(
    (acc, [key, value]) => {
      acc[key] =
        isObject(value) || isArray(value) ? JSON.stringify(value) : value;
      return acc;
    },
    {},
  );
};
