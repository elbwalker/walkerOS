import type { WebDestination } from '../types';

export function dataLayerDestination() {
  window.dataLayer = window.dataLayer || [];
  const dataLayerPush = (event: unknown) => {
    (window.dataLayer as unknown[]).push(event);
  };
  const destination: WebDestination.DestinationInit = {
    push: (event) => {
      dataLayerPush({
        ...event,
      });
    },
    pushBatch: (events) => {
      dataLayerPush({
        event: 'batch',
        batched_event: events[0].event.event, // Similar event names
        events,
      });
    },
    type: 'dataLayer',
  };

  return destination;
}
