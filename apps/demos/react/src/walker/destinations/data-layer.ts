import type { Destination, WalkerOS } from '@walkeros/core';

export const destinationDataLayer: Destination.Instance = {
  config: {},
  type: 'data-layer',
  push: async (event: WalkerOS.Event) => {
    // Access dataLayer as unknown and cast it
    const w = window as { dataLayer?: unknown };

    // Initialize dataLayer if it doesn't exist
    if (!w.dataLayer || !Array.isArray(w.dataLayer)) {
      w.dataLayer = [];
    }

    // Push event to dataLayer
    (w.dataLayer as Array<Record<string, unknown>>).push({
      event: event.name,
      ...event.data,
      walker: {
        entity: event.entity,
        action: event.action,
        timestamp: event.timestamp,
        group: event.group,
        user: event.user,
        nested: event.nested,
        context: event.context,
      },
    });
  },
};
