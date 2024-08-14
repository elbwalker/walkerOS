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
  };

  // Optional properties
  if (event.entity) destinationEvent.entity = event.entity;
  if (event.action) destinationEvent.entity = event.action;
  if (event.consent) destinationEvent.consent = stringify(event.consent);
  if (event.data) destinationEvent.data = stringify(event.data);
  if (event.context) destinationEvent.context = stringify(event.context);
  if (event.custom) destinationEvent.custom = stringify(event.custom);
  if (event.globals) destinationEvent.globals = stringify(event.globals);
  if (event.user) destinationEvent.user = stringify(event.user);
  if (event.nested && event.nested.length)
    destinationEvent.nested = JSON.stringify(event.nested); // Array
  if (event.trigger) destinationEvent.trigger = event.trigger;
  if (event.timing) destinationEvent.timing = event.timing;
  if (event.group) destinationEvent.group = event.group;
  if (event.count) destinationEvent.count = event.count;
  if (event.version) destinationEvent.version = stringify(event.version);
  if (event.source) destinationEvent.source = stringify(event.source);

  return destinationEvent;
};

function stringify(obj: WalkerOS.AnyObject): undefined | string {
  return Object.keys(obj).length ? JSON.stringify(obj) : undefined;
}
