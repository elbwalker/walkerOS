import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type KafkaStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Default event -- full WalkerOS.Event serialized as JSON to the configured
 * topic. Message key defaults to entity_action when no key path is set.
 */
export const defaultEvent: KafkaStepExample = {
  title: 'Default event',
  description:
    'An event is produced to the configured Kafka topic with the full JSON body and entity_action as the message key.',
  in: getEvent('page view', {
    timestamp: 1700000100,
  }),
  out: [
    [
      'producer.send',
      {
        topic: 'walkeros-events',
        messages: [
          {
            key: 'page_view',
            value: 'json:event',
            headers: { 'content-type': 'application/json' },
            timestamp: '1700000100',
          },
        ],
        acks: -1,
        compression: 1,
      },
    ],
  ],
};

/**
 * Mapped event name -- rule.name renames the event, which also changes the
 * default message key when no key mapping is configured.
 */
export const mappedEventName: KafkaStepExample = {
  title: 'Renamed event',
  description:
    'A mapping renames the event which also changes the default Kafka message key used for partitioning.',
  in: getEvent('order complete', {
    timestamp: 1700000101,
  }),
  mapping: {
    name: 'purchase',
  },
  out: [
    [
      'producer.send',
      {
        topic: 'walkeros-events',
        messages: [
          {
            key: 'purchase',
            value: 'json:event',
            headers: { 'content-type': 'application/json' },
            timestamp: '1700000101',
          },
        ],
        acks: -1,
        compression: 1,
      },
    ],
  ],
};

/**
 * Mapped data -- data.map transforms the event payload. Value is the mapped
 * object serialized as JSON.
 */
export const mappedData: KafkaStepExample = {
  title: 'Mapped payload',
  description:
    'A data mapping transforms the event payload before producing it as the Kafka message value.',
  in: getEvent('order complete', {
    timestamp: 1700000102,
    data: { id: 'ORD-400', total: 99.99, currency: 'EUR' },
  }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        order_id: 'data.id',
        revenue: 'data.total',
        currency: 'data.currency',
      },
    },
  },
  out: [
    [
      'producer.send',
      {
        topic: 'walkeros-events',
        messages: [
          {
            key: 'purchase',
            value: 'json:data',
            headers: { 'content-type': 'application/json' },
            timestamp: '1700000102',
          },
        ],
        acks: -1,
        compression: 1,
      },
    ],
  ],
};

/**
 * Key from user -- settings.kafka.key path resolves the message key from
 * the event (here user.id).
 */
export const keyFromUser: KafkaStepExample = {
  title: 'Key from user id',
  description:
    'A settings.kafka.key path resolves the message key from the event, here using user.id for per-user partitioning.',
  in: getEvent('user signup', {
    timestamp: 1700000103,
    user: { id: 'usr-789' },
    data: { plan: 'pro' },
  }),
  settings: {
    kafka: {
      brokers: ['localhost:9092'],
      topic: 'walkeros-events',
      key: 'user.id',
    },
  },
  out: [
    [
      'producer.send',
      {
        topic: 'walkeros-events',
        messages: [
          {
            key: 'usr-789',
            value: 'json:event',
            headers: { 'content-type': 'application/json' },
            timestamp: '1700000103',
          },
        ],
        acks: -1,
        compression: 1,
      },
    ],
  ],
};

/**
 * Topic override -- rule.settings.topic routes this rule to a different
 * topic than the destination default.
 */
export const topicOverride: KafkaStepExample = {
  title: 'Topic override',
  description:
    'A mapping rule overrides the destination topic so specific events are routed to a dedicated stream.',
  in: getEvent('order complete', {
    timestamp: 1700000104,
    data: { id: 'ORD-500', total: 42 },
  }),
  mapping: {
    settings: {
      topic: 'orders-stream',
    },
  },
  out: [
    [
      'producer.send',
      {
        topic: 'orders-stream',
        messages: [
          {
            key: 'order_complete',
            value: 'json:event',
            headers: { 'content-type': 'application/json' },
            timestamp: '1700000104',
          },
        ],
        acks: -1,
        compression: 1,
      },
    ],
  ],
};

/**
 * Ignored event -- mapping.ignore: true produces no producer.send call.
 */
export const ignoredEvent: KafkaStepExample = {
  public: false,
  in: getEvent('debug noise', {
    timestamp: 1700000105,
  }),
  mapping: { ignore: true },
  out: [],
};
