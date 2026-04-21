import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * HubSpot SDK step examples.
 *
 * At push time, the destination invokes the `@hubspot/api-client` SDK. The
 * public method paths users see on the client are:
 *
 *   - `events.send.basicApi.send(eventRequest)` — fires an event
 *   - `events.send.batchApi.send({ inputs: [...] })` — flushes a batch
 *   - `crm.contacts.basicApi.update(id, data, idProperty)` — contact upsert
 *
 * Each `out` is therefore a list of tuples `[['method.path', ...args], ...]`
 * matching the actual SDK call order. `identify` fires before the event.
 * When the destination skips an event (`skip: true`, `ignore: true`, or
 * missing identity), `out` is `[]`.
 */

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type HubSpotStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Default event forwarding -- events.send.basicApi.send() with auto-generated
 * event name. Email resolved from default settings.email = 'user.email'.
 */
export const defaultEvent: HubSpotStepExample = {
  title: 'Default event',
  description:
    'A walker event is sent to HubSpot as a custom behavioral event keyed by the user email.',
  in: getEvent('product view', {
    timestamp: 1700000100,
    user: { email: 'user@example.com' },
  }),
  out: [
    [
      'events.send.basicApi.send',
      {
        eventName: 'pe12345678_product_view',
        email: 'user@example.com',
        occurredAt: new Date(1700000100),
        properties: {},
      },
    ],
  ],
};

/**
 * Mapped event name -- mapping.settings.eventName overrides the auto-generated
 * name. The prefix is still prepended.
 */
export const mappedEventName: HubSpotStepExample = {
  title: 'Custom event name',
  description:
    'A mapping supplies a custom HubSpot event name and maps order data into properties for the behavioral event.',
  in: getEvent('order complete', {
    timestamp: 1700000101,
    user: { email: 'user@example.com' },
    data: { total: 99.5, currency: 'EUR', id: 'ord-123' },
  }),
  mapping: {
    name: 'order complete',
    settings: {
      eventName: 'purchase_completed',
      properties: {
        map: {
          revenue: 'data.total',
          currency: 'data.currency',
          order_id: 'data.id',
        },
      },
    },
  },
  out: [
    [
      'events.send.basicApi.send',
      {
        eventName: 'pe12345678_purchase_completed',
        email: 'user@example.com',
        occurredAt: new Date(1700000101),
        properties: {
          revenue: '99.5',
          currency: 'EUR',
          order_id: 'ord-123',
        },
      },
    ],
  ],
};

/**
 * Event with defaultProperties -- settings.defaultProperties are merged
 * into every event. Per-event properties override defaults.
 */
export const defaultProperties: HubSpotStepExample = {
  title: 'Default properties',
  description:
    'Destination-level default properties are merged into every HubSpot event payload, such as traffic source metadata.',
  in: getEvent('page view', {
    timestamp: 1700000102,
    user: { email: 'user@example.com' },
  }),
  settings: {
    defaultProperties: {
      hs_touchpoint_source: 'walkerOS',
      hs_page_content_type: 'STANDARD_PAGE',
    },
  },
  out: [
    [
      'events.send.basicApi.send',
      {
        eventName: 'pe12345678_page_view',
        email: 'user@example.com',
        occurredAt: new Date(1700000102),
        properties: {
          hs_touchpoint_source: 'walkerOS',
          hs_page_content_type: 'STANDARD_PAGE',
        },
      },
    ],
  ],
};

/**
 * Destination-level identify -- fires crm.contacts.basicApi.update() on
 * first push when settings.identify mapping resolves. Then fires the event.
 */
export const destinationIdentify: HubSpotStepExample = {
  title: 'Destination identify',
  description:
    'Destination-level identify upserts the HubSpot contact with mapped properties before sending the behavioral event.',
  in: getEvent('page view', {
    timestamp: 1700000103,
    user: { email: 'user@example.com', firstName: 'Jane', lastName: 'Doe' },
  }),
  settings: {
    identify: {
      map: {
        email: 'user.email',
        properties: {
          map: {
            firstname: 'user.firstName',
            lastname: 'user.lastName',
          },
        },
      },
    },
  },
  out: [
    [
      'crm.contacts.basicApi.update',
      'user@example.com',
      { properties: { firstname: 'Jane', lastname: 'Doe' } },
      'email',
    ],
    [
      'events.send.basicApi.send',
      {
        eventName: 'pe12345678_page_view',
        email: 'user@example.com',
        occurredAt: new Date(1700000103),
        properties: {},
      },
    ],
  ],
};

/**
 * Per-event identify with skip -- user login fires contact upsert only,
 * no custom event sent.
 */
export const userLoginIdentify: HubSpotStepExample = {
  title: 'User login identify',
  description:
    'A user login only upserts the HubSpot contact with profile and lifecycle properties, skipping the event send.',
  in: getEvent('user login', {
    timestamp: 1700000104,
    user: { email: 'user@example.com' },
    data: {
      email: 'login@acme.com',
      first_name: 'Jane',
      last_name: 'Doe',
      lifecycle: 'lead',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      identify: {
        map: {
          email: 'data.email',
          properties: {
            map: {
              firstname: 'data.first_name',
              lastname: 'data.last_name',
              lifecyclestage: 'data.lifecycle',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'crm.contacts.basicApi.update',
      'login@acme.com',
      {
        properties: {
          firstname: 'Jane',
          lastname: 'Doe',
          lifecyclestage: 'lead',
        },
      },
      'email',
    ],
  ],
};

/**
 * objectId association -- use objectId instead of email for contact
 * association on the event.
 */
export const objectIdAssociation: HubSpotStepExample = {
  title: 'Object id association',
  description:
    'The HubSpot event is associated via objectId instead of email, resolved from the walker user id.',
  in: getEvent('product view', {
    timestamp: 1700000105,
    user: { id: 'hs-contact-789' },
  }),
  settings: {
    email: undefined,
    objectId: 'user.id',
  },
  out: [
    [
      'events.send.basicApi.send',
      {
        eventName: 'pe12345678_product_view',
        objectId: 'hs-contact-789',
        occurredAt: new Date(1700000105),
        properties: {},
      },
    ],
  ],
};

/**
 * No identity resolved -- event is skipped with a warning. Neither email
 * nor objectId can be resolved from the event.
 */
export const noIdentity: HubSpotStepExample = {
  public: false,
  in: getEvent('product view', {
    timestamp: 1700000106,
    user: {},
  }),
  out: [],
};

/**
 * Wildcard ignore -- the event matches a mapping rule with ignore: true.
 * The destination fires zero SDK calls.
 */
export const wildcardIgnored: HubSpotStepExample = {
  public: false,
  in: getEvent('debug noise', {
    timestamp: 1700000107,
    user: { email: 'user@example.com' },
  }),
  mapping: { ignore: true },
  out: [],
};
