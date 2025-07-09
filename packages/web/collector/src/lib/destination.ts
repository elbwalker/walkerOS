import type { DestinationWeb } from '../types';

export function dataLayerDestination(): DestinationWeb.Init {
  window.dataLayer = window.dataLayer || [];
  const dataLayerPush = (event: unknown) => {
    (window.dataLayer as unknown[]).push(event);
  };
  const destination: DestinationWeb.Init = {
    push: (event, config, mapping, options = {}) => {
      // Do not process events from dataLayer source
      if (event.source?.type === 'dataLayer') return;

      const data = options.data || event;
      dataLayerPush(data);
    },
    pushBatch: (batch) => {
      dataLayerPush({
        event: 'batch',
        batched_event: batch.key,
        events: batch.data.length ? batch.data : batch.events,
      });
    },
    type: 'dataLayer',
  };

  return destination;
}
