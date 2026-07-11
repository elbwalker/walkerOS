import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

// Build-time version define. The upstream collector stamps source.release with
// this on push, so the expected payload must mirror it rather than a literal,
// else it breaks whenever the fixed version group is bumped (release).
declare const __VERSION__: string;

/**
 * Pub/Sub step examples. Each example's `out` is the array of recorded mock
 * calls produced by `push()`. The recording shape is:
 *   ['topic', topicName, topicOptions]   // implicit topic-handle creation
 *   ['publishMessage', topicName, messageOptions]
 *   ['resumePublishing', topicName, orderingKey] // only on publish failure
 */

// Events reaching a server destination arrive already enriched by the upstream
// collector, so they carry the run trace and per-run count. The collector
// preserves these (stamp-if-absent), keeping the example deterministic.
const orderEvent = getEvent('order complete', {
  timestamp: 1700001100,
  data: { id: 'ORD-500', total: 199.99, currency: 'EUR' },
  user: { id: 'usr-789' },
  source: {
    type: 'express',
    platform: 'server',
    trace: '1a2b3c4d5e6f70819a2b3c4d5e6f7081',
    count: 1,
  },
});

const pageEvent = getEvent('page view', {
  timestamp: 1700001101,
  data: { title: 'Documentation', url: 'https://example.com/docs' },
  source: {
    type: 'express',
    platform: 'server',
    trace: '9f8e7d6c5b4a39281706f5e4d3c2b1a0',
    count: 1,
  },
});

function expectedPayload(event: WalkerOS.Event): Buffer {
  // The harness pushes the event through an unconfigured collector, which stamps
  // source.release = { [name ?? platform ?? 'default']: __VERSION__ }. With no
  // collector name, the key is the event's platform. Mirror that here so the
  // expected message body matches the published (post-collector) event.
  const releaseKey = event.source.platform ?? 'default';
  const stamped = {
    ...event,
    source: { ...event.source, release: { [releaseKey]: __VERSION__ } },
  };
  return Buffer.from(JSON.stringify(stamped));
}

/**
 * Default publish, no mapping. Settings.topic = 'events'. The destination
 * constructs a topic handle inline with messageOrdering=false (no ordering
 * key resolved) and publishes the full event JSON as the message body.
 */
export const defaultPush: Flow.StepExample = {
  title: 'Default publish',
  description:
    'An event is published to the configured Pub/Sub topic with the full JSON event as the message body and no ordering key.',
  in: orderEvent,
  out: [
    ['topic', 'events', { messageOrdering: false }],
    ['publishMessage', 'events', { data: expectedPayload(orderEvent) }],
  ],
};

/**
 * Per-rule topic override. Mapping carries `settings.topic = 'orders'`
 * which routes this rule to a dedicated topic.
 */
export const mappedTopic: Flow.StepExample = {
  title: 'Topic override',
  description:
    'A mapping rule overrides the destination default topic so order events are published to a dedicated topic.',
  in: orderEvent,
  mapping: {
    settings: {
      topic: 'orders',
    },
  },
  out: [
    ['topic', 'orders', { messageOrdering: false }],
    ['publishMessage', 'orders', { data: expectedPayload(orderEvent) }],
  ],
};

/**
 * Per-rule ordering key resolved from the event. `mapping.orderingKey =
 * 'user.id'` is a Mapping.Value that resolves to the event's user.id. The
 * topic handle is constructed with messageOrdering=true and the publish
 * carries the resolved orderingKey.
 */
export const mappedOrderingKey: Flow.StepExample = {
  title: 'Ordering key from user',
  description:
    'A mapping resolves the ordering key from event.user.id, enabling per-user ordering for this publish.',
  in: orderEvent,
  mapping: {
    settings: {
      orderingKey: 'user.id',
    },
  },
  out: [
    ['topic', 'events', { messageOrdering: true }],
    [
      'publishMessage',
      'events',
      {
        data: expectedPayload(orderEvent),
        orderingKey: 'usr-789',
      },
    ],
  ],
};

/**
 * Per-rule attributes. `mapping.attributes = { entity: 'entity', action:
 * 'action' }` is a Mapping.Map resolved per event. Each value is a path
 * resolved against the event.
 */
export const mappedAttributes: Flow.StepExample = {
  title: 'Mapped attributes',
  description:
    'A mapping resolves a per-event attribute map, here exposing entity and action as Pub/Sub attributes for routing in subscribers.',
  in: orderEvent,
  mapping: {
    settings: {
      attributes: {
        entity: 'entity',
        action: 'action',
      },
    },
  },
  out: [
    ['topic', 'events', { messageOrdering: false }],
    [
      'publishMessage',
      'events',
      {
        data: expectedPayload(orderEvent),
        attributes: { entity: 'order', action: 'complete' },
      },
    ],
  ],
};

/**
 * Mapped data. `mapping.data` rewrites the publish body. The rewritten
 * object replaces the event as the message data.
 */
export const mappedData: Flow.StepExample = {
  title: 'Mapped payload',
  description:
    'A data mapping transforms the event payload before publish. The rewritten object becomes the Pub/Sub message body.',
  in: orderEvent,
  mapping: {
    data: {
      map: {
        order_id: 'data.id',
        revenue: 'data.total',
        currency: 'data.currency',
      },
    },
  },
  out: [
    ['topic', 'events', { messageOrdering: false }],
    [
      'publishMessage',
      'events',
      {
        // Mapped-data publish: the body is the mapping result (no event
        // envelope, so no source.release), emitted verbatim.
        data: Buffer.from(
          JSON.stringify({
            order_id: 'ORD-500',
            revenue: 199.99,
            currency: 'EUR',
          }),
        ),
      },
    ],
  ],
};

/**
 * Page view, no rule. Verifies free-form publish on a non-ordered topic
 * for an event with no special mapping.
 */
export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is published to the default topic with no ordering key, demonstrating the simplest publish path.',
  in: pageEvent,
  out: [
    ['topic', 'events', { messageOrdering: false }],
    ['publishMessage', 'events', { data: expectedPayload(pageEvent) }],
  ],
};
