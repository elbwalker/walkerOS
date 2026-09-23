import type { Collector, WalkerOS } from '@walkeros/core';
import type { CustomDimensions, Hit } from './types';
import { getMappingValue, isObject } from '@walkeros/core';

const DIMENSION_ID = /^\d+$/;
const DIMENSION_ARG_KEY = /^dimension(\d+)$/;

/** Merge by precedence destination < rule < argument; resolve Values; drop undefined; render dimension{id} ascending. */
export async function resolveDimensions(input: {
  destination?: CustomDimensions;
  rule?: CustomDimensions;
  argument?: unknown;
  event: WalkerOS.Event;
  collector: Collector.Instance;
}): Promise<Hit> {
  const { destination, rule, argument, event, collector } = input;
  const values = new Map<string, string>();

  for (const [id, mapping] of Object.entries({ ...destination, ...rule })) {
    if (!DIMENSION_ID.test(id)) continue;
    const value = await getMappingValue(event, mapping, { collector });
    if (value !== undefined && value !== null) values.set(id, String(value));
  }

  // The JS dimensions argument: { dimension{id}: value }, taken as is
  if (isObject(argument)) {
    for (const [key, value] of Object.entries(argument)) {
      const id = DIMENSION_ARG_KEY.exec(key)?.[1];
      if (id !== undefined && value !== undefined && value !== null)
        values.set(id, String(value));
    }
  }

  return [...values.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, value]): [string, string] => [`dimension${id}`, value]);
}
