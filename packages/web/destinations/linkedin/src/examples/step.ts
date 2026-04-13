import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally override destination-level settings for a test.
 * The test runner reads `settings` from the example and merges it into the
 * base destination settings (on top of the fixed `apiKey`). Rarely needed
 * for LinkedIn — conversion config lives on the rule, not destination-level.
 */
export type LinkedInStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * OPT-IN: Unmapped event is silently ignored.
 *
 * LinkedIn's core behavioral difference from analytics destinations: events
 * without `mapping.settings.conversion` produce ZERO lintrk() calls. The
 * destination is opt-in — each conversion must reference a pre-created
 * Conversion Rule from Campaign Manager.
 */
export const unmappedEventIgnored: LinkedInStepExample = {
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [],
};

/**
 * Simplest possible conversion — just a `conversion_id` from Campaign Manager.
 *
 * Form submission → LinkedIn Lead conversion. The mapping resolves `id` as a
 * literal value (no walker event field needed). The destination translates
 * `{ id }` → `lintrk('track', { conversion_id })`.
 */
export const simpleConversionId: LinkedInStepExample = {
  in: getEvent('form submit', { timestamp: 1700000101 }),
  mapping: {
    settings: {
      conversion: {
        map: {
          id: { value: 12345 },
        },
      },
    },
  },
  out: ['lintrk', 'track', { conversion_id: 12345 }],
};

/**
 * Full e-commerce conversion — every supported lintrk field populated.
 *
 * mapping config uses short walkerOS keys (`id`, `value`, `currency`, `eventId`);
 * the destination translates them to the vendor parameter names
 * (`conversion_id`, `conversion_value`, `currency`, `event_id`).
 *
 * Currency uses the walkerOS fallback syntax: `{ key, value }` — pull from
 * `data.currency` first, fall back to `"EUR"` if absent. The default
 * `order complete` fixture from `getEvent` already sets `data.currency: "EUR"`,
 * so the resolved value is "EUR" here.
 *
 * `eventId` maps from the walkerOS event.id — stable per event, unique, and
 * ready for deduplication with a future server (Conversions API) destination.
 */
export const orderCompleteFullConversion: LinkedInStepExample = {
  in: getEvent('order complete', { timestamp: 1700000102 }),
  mapping: {
    settings: {
      conversion: {
        map: {
          id: { value: 67890 },
          value: 'data.total',
          currency: { key: 'data.currency', value: 'EUR' },
          eventId: 'id',
        },
      },
    },
  },
  out: [
    'lintrk',
    'track',
    {
      conversion_id: 67890,
      conversion_value: 555,
      currency: 'EUR',
      event_id: '1700000102-gr0up-1',
    },
  ],
};

/**
 * Page view as an explicit conversion.
 *
 * LinkedIn's Insight Tag automatically fires a page view on load for
 * retargeting / audience building — that call is NOT something the
 * destination controls. This example tests the OTHER case: mapping a
 * specific walkerOS `page view` event to a Campaign Manager KEY_PAGE_VIEW
 * conversion rule, which fires an EXPLICIT lintrk('track') call in addition
 * to the auto page view.
 */
export const pageViewConversion: LinkedInStepExample = {
  in: getEvent('page view', { timestamp: 1700000103 }),
  mapping: {
    settings: {
      conversion: {
        map: {
          id: { value: 11111 },
          eventId: 'id',
        },
      },
    },
  },
  out: [
    'lintrk',
    'track',
    {
      conversion_id: 11111,
      event_id: '1700000103-gr0up-1',
    },
  ],
};

/**
 * Middle-funnel LEAD conversion — demo request without monetary value.
 *
 * LinkedIn's conversion types include LEAD, CONTACT, SIGN_UP, etc. The
 * destination is agnostic to the type (set in Campaign Manager, not at call
 * time) — all we forward is the conversion_id. This fixture exercises the
 * "id + eventId only" shape.
 */
export const demoRequestLead: LinkedInStepExample = {
  in: getEvent('demo request', { timestamp: 1700000104 }),
  mapping: {
    settings: {
      conversion: {
        map: {
          id: { value: 44444 },
          eventId: 'id',
        },
      },
    },
  },
  out: [
    'lintrk',
    'track',
    {
      conversion_id: 44444,
      event_id: '1700000104-gr0up-1',
    },
  ],
};

/**
 * rule.skip — fully-configured conversion rule temporarily disabled.
 *
 * The rule has a valid `conversion.map` but `skip: true` tells the destination
 * to produce zero calls. This is distinct from the opt-in default (no
 * `conversion` at all): skip explicitly keeps the rule on disk for quick
 * reactivation without deleting it.
 */
export const conversionSkipped: LinkedInStepExample = {
  in: getEvent('form submit', { timestamp: 1700000105 }),
  mapping: {
    skip: true,
    settings: {
      conversion: {
        map: {
          id: { value: 12345 },
        },
      },
    },
  },
  out: [],
};

/**
 * Falsy `id` → entire lintrk call is skipped.
 *
 * If the resolved conversion object has no truthy `id`, the destination does
 * NOT call lintrk at all. This protects against misconfigured mappings
 * (e.g. pulling id from a non-existent field).
 *
 * Here we map `id` from `data.nonexistentField` — it resolves to undefined,
 * so zero calls are produced.
 */
export const missingConversionIdIgnored: LinkedInStepExample = {
  in: getEvent('form submit', { timestamp: 1700000106 }),
  mapping: {
    settings: {
      conversion: {
        map: {
          id: 'data.nonexistentField',
        },
      },
    },
  },
  out: [],
};

/**
 * Partial conversion — value missing → omitted from the lintrk call.
 *
 * The rule asks for `value: 'data.missingTotal'` (undefined), `currency`
 * (undefined), and `eventId: 'id'` (present). Only `conversion_id` and
 * `event_id` appear in the final call — no `conversion_value`, no `currency`.
 */
export const partialFieldsOmitted: LinkedInStepExample = {
  in: getEvent('order complete', { timestamp: 1700000107 }),
  mapping: {
    settings: {
      conversion: {
        map: {
          id: { value: 67890 },
          value: 'data.missingTotal',
          eventId: 'id',
        },
      },
    },
  },
  out: [
    'lintrk',
    'track',
    {
      conversion_id: 67890,
      event_id: '1700000107-gr0up-1',
    },
  ],
};
