import type { Flow } from '@walkeros/core';

/**
 * The settings Kafka needs to deliver: the broker addresses and the topic.
 */
export const minimal: Flow.MinimalExample = {
  settings: {
    kafka: { brokers: ['localhost:9092'], topic: 'walkeros-events' },
  },
};
