import type { Destination } from '@walkerOS/core';
import type { DataLayer } from './types';
import { isObject } from '@walkerOS/core';

export function dataLayerDestination(): Destination.InitDestination {
  window.dataLayer = window.dataLayer || [];
  const dataLayerPush = (event: unknown) => {
    // Do not process events from dataLayer source
    if (
      isObject(event) &&
      isObject(event.source) &&
      String(event.source.type).includes('dataLayer')
    )
      return;

    (window.dataLayer as DataLayer)!.push(event);
  };
  const destination: Destination.Instance = {
    type: 'dataLayer',
    config: {},
    push: (event, context) => {
      dataLayerPush(context.data || event);
    },
    pushBatch: (batch) => {
      dataLayerPush({
        event: 'batch',
        batched_event: batch.key,
        events: batch.data.length ? batch.data : batch.events,
      });
    },
  };

  return destination;
}
