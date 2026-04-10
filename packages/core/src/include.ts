import type { WalkerOS } from './types';
import { isObject } from './is';

const SECTIONS: Record<string, (e: WalkerOS.DeepPartialEvent) => unknown> = {
  data: (e) => e.data,
  globals: (e) => e.globals,
  context: (e) => e.context,
  user: (e) => e.user,
  source: (e) => e.source,
  version: (e) => e.version,
  event: (e) => ({
    entity: e.entity,
    action: e.action,
    id: e.id,
    timestamp: e.timestamp,
    name: e.name,
    trigger: e.trigger,
    group: e.group,
    count: e.count,
    timing: (e as WalkerOS.Event).timing,
  }),
};

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
      // Context values are OrderedProperties tuples — extract the label.
      const value = section === 'context' && Array.isArray(raw) ? raw[0] : raw;
      out[`${section}_${key}`] = value;
    }
  }

  return out;
}
