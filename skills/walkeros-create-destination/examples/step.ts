import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

// One step example per supported feature / setting.
// `in`  is a WalkerOS.Event (getEvent returns the same event on every run).
// `out` lists the vendor calls the destination makes, as [callable, ...args]
//       tuples written from the vendor's documented calls.
// `mapping` is the mapping rule under test (optional: omit it for the default
//       push).

// Set `title` + `description` for public examples; mark test-only fixtures
// with `public: false`. See the walkeros-using-step-examples skill.

export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'The destination loads the vendor script and initializes the SDK with the API key.',
  in: { loadScript: true, settings: { apiKey: 'YOUR_API_KEY' } },
  out: [['window.vendorSdk', 'init', 'YOUR_API_KEY']],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order is sent as a purchase with its id, value and currency.',
  in: getEvent('order complete'),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        transaction_id: 'data.id',
        value: 'data.value',
        currency: { key: 'data.currency', value: 'EUR' },
      },
    },
  },
  out: [
    [
      'window.vendorSdk',
      'track',
      'purchase',
      { transaction_id: '0rd3r1d', value: 462, currency: 'EUR' },
    ],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description: 'A page view without a rule is sent under its walkerOS name.',
  in: getEvent('page view'),
  out: [['window.vendorSdk', 'track', 'page view', {}]],
};

// A silent rule sends nothing.
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no event.',
  in: getEvent('page view'),
  mapping: { silent: true },
  out: [],
};

// A consent revocation reaches the vendor.
export const consentRevoke: Flow.StepExample = {
  public: false,
  description:
    'For a destination with config.consent { marketing: true }, revoking marketing tells the vendor to revoke.',
  command: 'consent',
  in: { marketing: false },
  out: [['window.vendorSdk', 'consent', 'revoke']],
};
