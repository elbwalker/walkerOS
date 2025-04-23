import type { WalkerOS } from '@elbwalker/types';
import type { PushFn, Row } from './types';
import { isObject } from '@elbwalker/utils';

export const push: PushFn = async function (event, config, mapping, options) {
  const { client, datasetId, tableId } = config.custom!;

  const row = options?.data ? options.data : mapEvent(event);
  const rows = [row];

  await client.dataset(datasetId).table(tableId).insert(rows);

  return;
};

export const mapEvent = (event: WalkerOS.Event): Row => {
  const now = new Date();

  const destinationEvent: Row = {
    timestamp: event.timestamp ? new Date(event.timestamp) : now,
    event: event.event,
    createdAt: now,
    data: stringify(event.data),
    context: stringify(event.context),
    globals: stringify(event.globals),
    user: stringify(event.user),
    nested: JSON.stringify(event.nested),
    consent: stringify(event.consent),
    id: event.id,
    trigger: event.trigger,
    entity: event.entity,
    action: event.action,
    custom: stringify(event.custom),
    timing: event.timing,
    group: event.group,
    count: event.count,
    version: stringify(event.version),
    source: stringify(event.source),
  };

  return destinationEvent;
};

function stringify(obj?: WalkerOS.AnyObject): undefined | string {
  return isObject(obj) ? JSON.stringify(obj) : undefined;
}
