import type { WalkerOS } from '@walkeros/core';
import type { PushFn } from './types';
import { isObject, isArray } from '@walkeros/core';

export const push: PushFn = async function (
  event,
  { config, mapping: _mapping, data, logger },
) {
  const { client, datasetId, tableId } = config.settings!;

  if (!client) return logger.throw('client is missing');
  if (!datasetId) return logger.throw('datasetId is missing');
  if (!tableId) return logger.throw('tableId is missing');

  let row: WalkerOS.AnyObject | undefined;

  if (isObject(data)) {
    row = data;
  } else {
    const now = new Date();
    row = {
      ...event,
      timestamp: event.timestamp ? new Date(event.timestamp) : now,
      createdAt: now,
    };
  }

  const rows = [mapEvent(row)];

  logger.debug('Calling BigQuery API', {
    dataset: datasetId,
    table: tableId,
    rowCount: rows.length,
  });

  await client.dataset(datasetId).table(tableId).insert(rows);

  logger.debug('BigQuery API response', { ok: true });

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
