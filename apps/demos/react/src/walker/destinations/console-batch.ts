import type { Destination } from '@walkeros/core';

export const destinationConsoleBatch: Destination.InitDestination = {
  type: 'console-batch',
  init: async () => {
    // eslint-disable-next-line no-console
    console.log('[Console Batch] Initialized');
  },
  push: async () => {
    // Individual events are collected by the collector when batch is configured
    // They will be sent to pushBatch when the batch size is reached
  },
  pushBatch: async (batch) => {
    // Handle the batch of events
    const events = batch.events || [];
    // eslint-disable-next-line no-console
    console.log(`[Batch] ${events.length} events:`, events);
    // eslint-disable-next-line no-console
    console.log('[Batch] Context:', {
      key: batch.key,
      data: batch.data,
    });
  },
};
