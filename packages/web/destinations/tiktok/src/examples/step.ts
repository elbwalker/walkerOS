import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally carry destination-level settings. The test
 * runner reads `settings` from the example and merges it into the base
 * destination settings on top of the fixed apiKey.
 */
export type TikTokStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
};

/**
 * Default event forwarding — every walkerOS event becomes a ttq.track()
 * call. With no mapping and no destination-level include, the params
 * object is empty. event_id is always passed as the 3rd argument (TikTok
 * dedup between pixel and Events API).
 *
 * NOTE: The raw walkerOS event name "product view" (with space) is NOT a
 * TikTok standard event. Without a mapping.name override, TikTok treats
 * it as a custom event — functional for audience building, no
 * optimization. The next example shows the recommended override.
 */
export const defaultEventForwarding: TikTokStepExample = {
  title: 'Default track',
  description:
    'Without a mapping the walker event name is forwarded to ttq.track with an event_id for TikTok dedup.',
  in: getEvent('product view'),
  out: [
    [
      'ttq.track',
      'product view',
      {},
      { event_id: getEvent('product view').id },
    ],
  ],
};

/**
 * Wildcard ignore — walkerOS's standard way to drop events. The rule
 * matches but does nothing. The destination fires zero SDK calls.
 */
export const wildcardIgnored: TikTokStepExample = {
  public: false,
  in: getEvent('product view'),
  mapping: { ignore: true },
  out: [],
};

/**
 * The canonical TikTok pattern: walkerOS "product view" → TikTok
 * "ViewContent" via mapping.name. mapping.data builds the TikTok-native
 * parameter shape (content_type, content_id, content_name, value,
 * currency). include is explicitly set to [] so prefixed walkerOS
 * properties don't leak onto the call and confuse TikTok's matcher.
 */
export const productViewContent: TikTokStepExample = {
  title: 'View content',
  description:
    'A product view is renamed to the TikTok ViewContent standard event with content_type, id, value, and currency.',
  in: getEvent('product view'),
  mapping: {
    name: 'ViewContent',
    data: {
      map: {
        content_type: { value: 'product' },
        content_id: 'data.id',
        content_name: 'data.name',
        content_category: 'data.category',
        value: 'data.price',
        currency: { key: 'globals.currency', value: 'EUR' },
      },
    },
    include: [],
  },
  out: [
    [
      'ttq.track',
      'ViewContent',
      {
        content_type: 'product',
        content_id: 'ers',
        content_name: 'Everyday Ruck Snack',
        // content_category is absent from the default product view fixture;
        // the mapper skips undefined resolutions.
        value: 420,
        currency: 'EUR', // fallback — default fixture has no globals.currency
      },
      { event_id: getEvent('product view').id },
    ],
  ],
};

/**
 * Destination-level settings.include flattens the walkerOS `data` section
 * into prefixed TikTok event parameters on every push. This is the
 * "dump everything" mode — useful for custom events where TikTok won't
 * do optimization anyway, and no mapping.data is needed.
 */
export const destinationLevelInclude: TikTokStepExample = {
  title: 'Include data',
  description:
    'Destination-level include flattens the event data section into prefixed TikTok event parameters.',
  in: getEvent('product view'),
  configInclude: ['data'],
  out: [
    [
      'ttq.track',
      'product view',
      {
        data_id: 'ers',
        data_name: 'Everyday Ruck Snack',
        data_color: 'black',
        data_size: 'l',
        data_price: 420,
      },
      { event_id: getEvent('product view').id },
    ],
  ],
};

/**
 * Per-rule settings.include REPLACES destination-level include for the
 * matched rule (design doc §6: mapping-level include replaces, not
 * merges with, destination-level include).
 */
export const ruleIncludeReplaces: TikTokStepExample = {
  title: 'Rule include overrides',
  description:
    'A per-rule include replaces the destination-level include so this event forwards only globals.',
  in: getEvent('order complete'),
  configInclude: ['data'],
  mapping: {
    include: ['globals'],
  },
  out: [
    [
      'ttq.track',
      'order complete',
      {
        globals_pagegroup: 'shop',
      },
      { event_id: getEvent('order complete').id },
    ],
  ],
};

/**
 * Destination-level settings.identify fires on the first push (once the
 * state cache is empty). Advanced Matching parameters (email,
 * phone_number, external_id) are passed to ttq.identify() which
 * auto-hashes them SHA256 before sending. Subsequent pushes with
 * unchanged values do NOT re-fire ttq.identify() — runtime state tracks
 * the last-resolved identity.
 *
 * walkerOS's default user fixture has user.id='us3r' and no email/phone,
 * so the example injects data and maps from there.
 */
export const destinationLevelIdentify: TikTokStepExample = {
  title: 'Advanced matching',
  description:
    'Destination-level identify calls ttq.identify with email, phone, and external id for TikTok advanced matching.',
  in: getEvent('page view', {
    data: {
      email: 'user@acme.com',
      phone: '+14135552671',
    },
  }),
  settings: {
    identify: {
      map: {
        email: 'data.email',
        phone_number: 'data.phone',
        external_id: 'user.id',
      },
    },
  },
  out: [
    [
      'ttq.identify',
      {
        email: 'user@acme.com',
        phone_number: '+14135552671',
        external_id: 'us3r',
      },
    ],
    ['ttq.track', 'page view', {}, { event_id: getEvent('page view').id }],
  ],
};

/**
 * User registration → CompleteRegistration standard event with per-event
 * identify. The user just provided their email + phone, so this is the
 * moment to fire Advanced Matching for this session. The per-event
 * identify overrides any destination-level identify for this one push.
 */
export const userRegisterCompleteRegistration: TikTokStepExample = {
  title: 'Complete registration',
  description:
    'A user register fires ttq.identify for advanced matching and then tracks CompleteRegistration.',
  in: getEvent('user register', {
    data: {
      email: 'new@acme.com',
      phone: '+14135551234',
      user_id: 'new-user-123',
    },
  }),
  mapping: {
    name: 'CompleteRegistration',
    include: [],
    data: {
      map: {
        content_type: { value: 'product' },
      },
    },
    settings: {
      identify: {
        map: {
          email: 'data.email',
          phone_number: 'data.phone',
          external_id: 'data.user_id',
        },
      },
    },
  },
  out: [
    [
      'ttq.identify',
      {
        email: 'new@acme.com',
        phone_number: '+14135551234',
        external_id: 'new-user-123',
      },
    ],
    [
      'ttq.track',
      'CompleteRegistration',
      {
        content_type: 'product',
      },
      { event_id: getEvent('user register').id },
    ],
  ],
};

/**
 * Multi-product order → CompletePayment standard event. The canonical
 * TikTok ecommerce pattern:
 *  - mapping.name flips the walkerOS event to TikTok's rigid taxonomy
 *  - mapping.data builds the TikTok-native parameter shape
 *  - loop iterates event.nested to produce the `contents` array, one
 *    entry per product
 *  - { key, value: 'EUR' } provides a currency fallback if data.currency
 *    is absent (here data.currency is 'EUR' so the key wins)
 *
 * The default "order complete" fixture has 3 nested entries: two
 * products (ers, cc) and one gift (Surprise — no id, no price).
 */
export const orderCompleteCompletePayment: TikTokStepExample = {
  title: 'Complete payment',
  description:
    'A completed order is mapped to TikTok CompletePayment with value, currency, and nested product contents.',
  in: getEvent('order complete'),
  mapping: {
    name: 'CompletePayment',
    data: {
      map: {
        content_type: { value: 'product' },
        value: 'data.total',
        currency: { key: 'data.currency', value: 'EUR' },
        order_id: 'data.id',
        contents: {
          loop: [
            'nested',
            {
              map: {
                content_id: 'data.id',
                content_name: 'data.name',
                quantity: { key: 'data.quantity', value: 1 },
                price: 'data.price',
              },
            },
          ],
        },
      },
    },
    include: [],
  },
  out: [
    [
      'ttq.track',
      'CompletePayment',
      {
        content_type: 'product',
        value: 555,
        currency: 'EUR',
        order_id: '0rd3r1d',
        contents: [
          {
            content_id: 'ers',
            content_name: 'Everyday Ruck Snack',
            quantity: 1, // fallback — fixture has no data.quantity
            price: 420,
          },
          {
            content_id: 'cc',
            content_name: 'Cool Cap',
            quantity: 1,
            price: 42,
          },
          {
            // gift entry — { name: 'Surprise' }, no id and no price.
            // walkerOS map skips keys whose resolved value is undefined.
            content_name: 'Surprise',
            quantity: 1,
          },
        ],
      },
      { event_id: getEvent('order complete').id },
    ],
  ],
};

/**
 * Search → TikTok Search standard event. Minimal example that shows how
 * a walkerOS search event flips through mapping.name with a single
 * mapping.data field (the query string).
 */
export const searchSubmitSearch: TikTokStepExample = {
  title: 'Search',
  description:
    'A search submit fires TikTok Search with the query field mapped from event data.',
  in: getEvent('search submit', {
    data: {
      term: 'hiking backpack',
    },
  }),
  mapping: {
    name: 'Search',
    data: {
      map: {
        query: 'data.term',
      },
    },
    include: [],
  },
  out: [
    [
      'ttq.track',
      'Search',
      {
        query: 'hiking backpack',
      },
      { event_id: getEvent('search submit').id },
    ],
  ],
};

/**
 * Consent granted → ttq.enableCookie(). The destination checks the
 * consent keys declared in config.consent (here "marketing" — TikTok is
 * an ad platform, not analytics) and toggles cookie behavior.
 *
 * Uses the canonical StepExample.command='consent' pattern: the test
 * runner dispatches via elb('walker consent', in) instead of pushing
 * an event.
 */
export const consentGrantEnableCookie: TikTokStepExample = {
  title: 'Consent granted',
  description:
    'A walker consent grant for marketing calls ttq.enableCookie so TikTok can set and read its attribution cookie.',
  command: 'consent',
  in: { marketing: true } as WalkerOS.Consent,
  settings: {} as Partial<Settings>, // consent key is derived from config.consent
  out: [['ttq.enableCookie']],
};

/**
 * Consent revoked → ttq.disableCookie(). TikTok stops setting and
 * reading its first-party cookie (_ttp) for attribution.
 */
export const consentRevokeDisableCookie: TikTokStepExample = {
  title: 'Consent revoked',
  description:
    'A walker consent revoke for marketing calls ttq.disableCookie so TikTok stops using its first-party cookie.',
  command: 'consent',
  in: { marketing: false } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['ttq.disableCookie']],
};
