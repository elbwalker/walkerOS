import type { Collector, WalkerOS } from '@walkeros/core';
import type { CustomDimensions, Hit } from './types';
import { getMappingValue } from '@walkeros/core';
import { toText } from './items';

const DIMENSION_ID = /^\d+$/;

/**
 * Destination and rule dimensions resolved against the event, the rule's
 * winning per key, rendered as dimension<id> in ascending id order. A value
 * that resolves to nothing, an object or an array is not sent.
 */
export async function resolveDimensions(input: {
  destination?: CustomDimensions;
  rule?: CustomDimensions;
  event: WalkerOS.Event;
  collector: Collector.Instance;
}): Promise<Hit> {
  const { destination, rule, event, collector } = input;
  const values = new Map<string, string>();

  for (const [id, mapping] of Object.entries({ ...destination, ...rule })) {
    if (!DIMENSION_ID.test(id)) continue;
    const value = toText(await getMappingValue(event, mapping, { collector }));
    if (value !== undefined) values.set(id, value);
  }

  return [...values.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, value]): [string, string] => [`dimension${id}`, value]);
}
