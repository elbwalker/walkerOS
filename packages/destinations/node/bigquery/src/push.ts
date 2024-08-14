import type { WalkerOS } from '@elbwalker/types';
import type { Config, PushEvents, Row } from './types';

export const push = async function (events: PushEvents, config: Config) {
  const { client, datasetId, tableId } = config.custom;

  const rows = events.map((event) => mapEvent(event.event));

  await client.dataset(datasetId).table(tableId).insert(rows);

  return { queue: [] };
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
  return obj && Object.keys(obj).length ? JSON.stringify(obj) : undefined;
}
