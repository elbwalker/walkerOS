import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * HubSpot SDK step examples.
 *
 * At push time, the destination invokes the `@hubspot/api-client` SDK. The
 * public method paths users see on the client are:
 *
 *   - `events.send.basicApi.send(eventRequest)` - fires an event
 *   - `events.send.batchApi.send({ inputs: [...] })` - flushes a batch
 *   - `crm.contacts.basicApi.update(id, data, idProperty)` - contact upsert
 *
 * Each `out` is therefore a list of tuples `[['method.path', ...args], ...]`
 * matching the actual SDK call order. `identify` fires before the event.
 * When the destination skips an event (`silent: true`, `ignore: true`, or
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
    timestamp: 1700000100000,
    user: { email: 'user@example.com' },
  }),
  out: [
    [
      'events.send.basicApi.send',
      {
        eventName: 'pe12345678_product_view',
        email: 'user@example.com',
        occurredAt: new Date(1700000100000),
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
    timestamp: 1700000101000,
    user: { email: 'user@example.com' },
    data: { value: 99.5, currency: 'EUR', id: 'ord-123' },
  }),
  mapping: {
    name: 'order complete',
    settings: {
      eventName: 'purchase_completed',
      properties: {
        map: {
          revenue: 'data.value',
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
        occurredAt: new Date(1700000101000),
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
    'Destination-level settings.defaultProperties are merged into every HubSpot event payload, such as traffic source metadata.',
  in: getEvent('page view', {
    timestamp: 1700000102000,
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
        occurredAt: new Date(1700000102000),
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
    'With settings.identify mapping the email and name properties, the destination updates the HubSpot contact by email before sending the behavioral event.',
  in: getEvent('page view', {
    timestamp: 1700000103000,
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
        occurredAt: new Date(1700000103000),
        properties: {},
      },
    ],
  ],
};

/**
 * Per-event identify with silent -- user login fires contact upsert only,
 * no custom event sent.
 */
export const userLoginIdentify: HubSpotStepExample = {
  title: 'User login identify',
  description:
    'A user login only updates the HubSpot contact by email with profile and lifecycle properties, skipping the event send.',
  in: createEvent({
    name: 'user login',
    timestamp: 1700000104000,
    user: { email: 'user@example.com' },
    data: {
      email: 'login@acme.com',
      first_name: 'Jane',
      last_name: 'Doe',
      lifecycle: 'lead',
    },
  }),
  mapping: {
    silent: true,
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
    'With settings.objectId set to user.id, the HubSpot event is associated via objectId instead of email.',
  in: getEvent('product view', {
    timestamp: 1700000105000,
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
        occurredAt: new Date(1700000105000),
        properties: {},
      },
    ],
  ],
};

/**
 * No identity resolved -- neither email nor objectId resolves from the
 * event, so it cannot be associated with a contact: the push fails with
 * missing-input instead of counting as delivered. One per event name above,
 * so every example's event without identity has its declared outcome.
 */
function withoutIdentity(name: string, timestamp: number): HubSpotStepExample {
  return {
    public: false,
    description: `A ${name} event without email or objectId cannot be associated with a HubSpot contact: the push fails with missing-input instead of counting as delivered.`,
    in: { name, timestamp },
    out: [],
    outcome: { status: 'failed', code: 'missing-input', retryable: false },
  };
}

export const noIdentity = withoutIdentity('product view', 1700000106000);
export const noIdentityOrder = withoutIdentity('order complete', 1700000108000);
export const noIdentityPage = withoutIdentity('page view', 1700000109000);
export const noIdentityLogin = withoutIdentity('user login', 1700000110000);

/**
 * Silent rule -- no custom event is sent; without an identify mapping there
 * is no contact upsert either.
 */
export const silentRule: HubSpotStepExample = {
  public: false,
  description:
    'A rule with silent: true sends no HubSpot event; without an identify mapping nothing is called.',
  in: createEvent({
    name: 'page view',
    timestamp: 1700000111000,
    user: { email: 'user@example.com' },
  }),
  mapping: { silent: true },
  out: [],
};

/**
 * Wildcard ignore -- the event matches a mapping rule with ignore: true.
 * The destination fires zero SDK calls.
 */
export const wildcardIgnored: HubSpotStepExample = {
  public: false,
  in: createEvent({
    name: 'debug noise',
    timestamp: 1700000107000,
    user: { email: 'user@example.com' },
  }),
  mapping: { ignore: true },
  out: [],
};

/**
 * The silent identify rule of userLoginIdentify on a login without the email
 * it maps: no contact can be upserted and the rule suppresses the event, so
 * nothing is sent.
 */
export const userLoginWithoutEmail: HubSpotStepExample = {
  public: false,
  description:
    'A silent identify rule whose email finds no data sends nothing: an unmet mapping, not a failure, so the push returns normally.',
  in: {
    name: 'user login',
    entity: 'user',
    action: 'login',
    timestamp: 1700000112000,
    user: { email: 'user@example.com' },
  },
  mapping: userLoginIdentify.mapping,
  out: [],
};
