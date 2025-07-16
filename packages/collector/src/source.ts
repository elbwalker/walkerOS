import type { WalkerOS } from '@walkerOS/core';
import { getId } from '@walkerOS/core';
import type { Source } from './types';

export async function init(
  collector: WalkerOS.Collector,
  sources: Source[],
): Promise<void> {
  if (!collector.sources) {
    collector.sources = {};
  }

  // Use Promise.all for parallel initialization of sources
  await Promise.all(
    sources.map(async (source) => {
      const id = source.type + '_' + getId(4);
      collector.sources![id] = source;

      if (source.init) {
        await source.init(collector, {
          mapping: source.mapping,
          settings: source.settings || {},
        });
      }
    }),
  );
}

export async function addSource(
  collector: WalkerOS.Collector,
  source: Source,
): Promise<void> {
  if (!collector.sources) {
    collector.sources = {};
  }

  const id = source.type + '_' + getId(4);
  collector.sources[id] = source;

  if (source.init) {
    await source.init(collector, {
      mapping: source.mapping,
      settings: source.settings || {},
    });
  }
}
