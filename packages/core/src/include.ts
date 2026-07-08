import type { WalkerOS } from './types';
import { isObject } from './is';

const SECTIONS: Record<string, (e: WalkerOS.DeepPartialEvent) => unknown> = {
  data: (e) => e.data,
  globals: (e) => e.globals,
  context: (e) => e.context,
  user: (e) => e.user,
  source: (e) => e.source,
  event: (e) => ({
    entity: e.entity,
    action: e.action,
    id: e.id,
    timestamp: e.timestamp,
    name: e.name,
    trigger: e.trigger,
    timing: (e as WalkerOS.Event).timing,
  }),
};

// Recurse into plain objects (maps), joining keys with an underscore, so a
// nested map becomes fully flattened leaf keys. Arrays are leaves and kept
// as-is; only plain objects recurse.
function flattenInto(
  out: Record<string, unknown>,
  prefix: string,
  value: unknown,
): void {
  if (isObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      flattenInto(out, `${prefix}_${k}`, v);
    }
  } else {
    out[prefix] = value;
  }
}

export function flattenIncludeSections(
  event: WalkerOS.DeepPartialEvent,
  sections: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const effective = sections.includes('all') ? Object.keys(SECTIONS) : sections;

  for (const section of effective) {
    const picker = SECTIONS[section];
    if (!picker) continue;
    const bag = picker(event);
    if (!isObject(bag)) continue;

    for (const [key, raw] of Object.entries(bag as Record<string, unknown>)) {
      if (raw === undefined) continue;
      // Context values are OrderedProperties tuples - extract the label first,
      // then flatten (the label is usually a string leaf).
      const value = section === 'context' && Array.isArray(raw) ? raw[0] : raw;
      flattenInto(out, `${section}_${key}`, value);
    }
  }

  return out;
}
