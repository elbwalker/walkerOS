import type { Flow, WalkerOS } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally carry destination-level settings. The test
 * runner reads `settings` from the example and merges it into the base
 * destination settings on top of the fixed apiKey.
 */
export type TikTokStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
  /** Consent granted before `in` so a gated destination is loaded first. */
  before?: WalkerOS.Consent;
};

/**
 * Default event forwarding - every walkerOS event becomes a ttq.track()
 * call. With no mapping and no destination-level include, the params
 * object is empty. event_id is always passed as the 3rd argument (TikTok
 * dedup between pixel and Events API).
 *
 * NOTE: The raw walkerOS event name "product view" (with space) is NOT a
 * TikTok standard event. Without a mapping.name override, TikTok treats
 * it as a custom event - functional for audience building, no
 * optimization. The next example shows the recommended override.
 */
export const defaultEventForwarding: TikTokStepExample = {
  title: 'Default track',
  description:
    'Without a mapping the walker event name is forwarded to ttq.track with an event_id for TikTok dedup.',
  in: getEvent('product view', { id: '0123456789abcdef' }),
  out: [
    ['window.ttq.track', 'product view', {}, { event_id: '0123456789abcdef' }],
  ],
};

/**
 * Wildcard ignore - walkerOS's standard way to drop events. The rule
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
  in: getEvent('product view', { id: '11111111aaaaaaaa' }),
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
      'window.ttq.track',
      'ViewContent',
      {
        content_type: 'product',
        content_id: 'ers',
        content_name: 'Everyday Ruck Snack',
        // content_category is absent from the default product view fixture;
        // the mapper skips undefined resolutions.
        value: 420,
        currency: 'EUR', // fallback - default fixture has no globals.currency
      },
      { event_id: '11111111aaaaaaaa' },
    ],
  ],
};

/**
 * Destination-level config.include flattens the walkerOS `data` section
 * into prefixed TikTok event parameters on every push. This is the
 * "dump everything" mode - useful for custom events where TikTok won't
 * do optimization anyway, and no mapping.data is needed.
 */
export const destinationLevelInclude: TikTokStepExample = {
  title: 'Include data',
  description:
    'With config.include set to data, the event data section is flattened into prefixed TikTok event parameters.',
  in: getEvent('product view', { id: '22222222bbbbbbbb' }),
  configInclude: ['data'],
  out: [
    [
      'window.ttq.track',
      'product view',
      {
        data_id: 'ers',
        data_name: 'Everyday Ruck Snack',
        data_color: 'black',
        data_size: 'l',
        data_price: 420,
        data_currency: 'EUR',
      },
      { event_id: '22222222bbbbbbbb' },
    ],
  ],
};

/**
 * A rule's include REPLACES the destination-level config.include for the
 * matched rule; the two are not merged.
 */
export const ruleIncludeReplaces: TikTokStepExample = {
  title: 'Rule include overrides',
  description:
    'With config.include set to data, a rule include of globals replaces it, so this event forwards only globals.',
  in: getEvent('order complete', { id: '33333333cccccccc' }),
  configInclude: ['data'],
  mapping: {
    include: ['globals'],
  },
  out: [
    [
      'window.ttq.track',
      'order complete',
      {
        globals_pagegroup: 'shop',
      },
      { event_id: '33333333cccccccc' },
    ],
  ],
};

/**
 * Destination-level settings.identify fires on the first push (once the
 * state cache is empty). Advanced Matching parameters (email,
 * phone_number, external_id) are passed to ttq.identify() unhashed.
 * Subsequent pushes with unchanged values do NOT re-fire ttq.identify() -
 * runtime state tracks the last-resolved identity.
 *
 * walkerOS's default user fixture has user.id='us3r' and no email/phone,
 * so the example injects data and maps from there.
 */
export const destinationLevelIdentify: TikTokStepExample = {
  title: 'Advanced matching',
  description:
    'With settings.identify mapping email, phone and external id, the first push calls ttq.identify for TikTok advanced matching before the track call.',
  in: getEvent('page view', {
    id: '44444444dddddddd',
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
      'window.ttq.identify',
      {
        email: 'user@acme.com',
        phone_number: '+14135552671',
        external_id: 'us3r',
      },
    ],
    ['window.ttq.track', 'page view', {}, { event_id: '44444444dddddddd' }],
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
  in: createEvent({
    name: 'user register',
    id: '55555555eeeeeeee',
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
      'window.ttq.identify',
      {
        email: 'new@acme.com',
        phone_number: '+14135551234',
        external_id: 'new-user-123',
      },
    ],
    [
      'window.ttq.track',
      'CompleteRegistration',
      {
        content_type: 'product',
      },
      { event_id: '55555555eeeeeeee' },
    ],
  ],
};

/**
 * Multi-product order → Purchase standard event. The canonical
 * TikTok ecommerce pattern:
 *  - mapping.name flips the walkerOS event to TikTok's rigid taxonomy
 *  - mapping.data builds the TikTok-native parameter shape
 *  - loop iterates event.nested to produce the `contents` array, one
 *    entry per product
 *  - { key, value: 'EUR' } provides a currency fallback if data.currency
 *    is absent (here data.currency is 'EUR' so the key wins)
 *
 * The default "order complete" fixture has 3 nested entries: two
 * products (ers, cc) and one gift (Surprise - no id, no price).
 */
export const orderCompletePurchase: TikTokStepExample = {
  title: 'Purchase',
  description:
    'A completed order is mapped to TikTok Purchase with value, currency, and nested product contents.',
  in: getEvent('order complete', { id: '66666666ffffffff' }),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        content_type: { value: 'product' },
        value: 'data.value',
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
      'window.ttq.track',
      'Purchase',
      {
        content_type: 'product',
        value: 462,
        currency: 'EUR',
        order_id: '0rd3r1d',
        contents: [
          {
            content_id: 'ers',
            content_name: 'Everyday Ruck Snack',
            quantity: 1, // fallback - fixture has no data.quantity
            price: 420,
          },
          {
            content_id: 'cc',
            content_name: 'Cool Cap',
            quantity: 1,
            price: 42,
          },
          {
            // gift entry - { name: 'Surprise' }, no id and no price.
            // walkerOS map skips keys whose resolved value is undefined.
            content_name: 'Surprise',
            quantity: 1,
          },
        ],
      },
      { event_id: '66666666ffffffff' },
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
  in: createEvent({
    name: 'search submit',
    id: '777777770000aaaa',
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
      'window.ttq.track',
      'Search',
      {
        query: 'hiking backpack',
      },
      { event_id: '777777770000aaaa' },
    ],
  ],
};

/**
 * Consent granted → ttq.enableCookie(). The destination checks the
 * consent keys declared in config.consent (here "marketing" - TikTok is
 * an ad platform, not analytics) and toggles cookie behavior.
 *
 * Uses the canonical StepExample.command='consent' pattern: the test
 * runner dispatches via elb('walker consent', in) instead of pushing
 * an event.
 */
export const consentGrantEnableCookie: TikTokStepExample = {
  title: 'Consent granted',
  description:
    'With config.consent set to marketing, a walker consent grant for marketing calls ttq.enableCookie so TikTok can set and read its attribution cookie.',
  command: 'consent',
  in: { marketing: true } as WalkerOS.Consent,
  settings: {} as Partial<Settings>, // the consent key comes from config.consent
  out: [['window.ttq.enableCookie']],
};

/**
 * Consent revoked → ttq.disableCookie(). TikTok stops setting and
 * reading its first-party cookie (_ttp) for attribution.
 */
export const consentRevokeDisableCookie: TikTokStepExample = {
  title: 'Consent revoked',
  description:
    'With config.consent set to marketing, a walker consent revoke for marketing calls ttq.disableCookie so TikTok stops using its first-party cookie.',
  command: 'consent',
  before: { marketing: true },
  in: { marketing: false } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['window.ttq.disableCookie']],
};

/** A silent rule sends no track call. */
export const silentRule: TikTokStepExample = {
  public: false,
  description: 'A rule with silent: true sends no ttq.track call.',
  in: getEvent('page view', { timestamp: 1700000600000 }),
  mapping: { silent: true },
  out: [],
};

/**
 * A silent rule that only sets an identity, on an event with no email, phone
 * or id: nothing resolves and the rule suppresses the track, so nothing is
 * sent. A declared skip: an unmet mapping, not a failure.
 */
export const silentIdentifyWithoutData: TikTokStepExample = {
  public: false,
  description:
    'A silent rule whose identify mapping finds no email, phone or id sends nothing: an unmet mapping, not a failure, so the push returns normally.',
  in: { name: 'user update', entity: 'user', action: 'update' },
  mapping: {
    silent: true,
    settings: {
      identify: {
        map: {
          email: 'data.email',
          phone_number: 'data.phone',
          external_id: 'data.id',
        },
      },
    },
  },
  out: [],
};
