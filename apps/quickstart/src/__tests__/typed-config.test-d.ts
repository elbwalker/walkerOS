/**
 * Compile-time proof that a flow configured in code is typed per step from
 * the real packages: settings, mapping rule settings and callbacks are
 * checked, and an untyped inline destination stays loose on its own.
 * Checked by the package `tsc --noEmit`; jest never runs `.test-d.ts` files.
 */
import type { Collector, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationAPI } from '@walkeros/web-destination-api';
import { destinationGtag } from '@walkeros/web-destination-gtag';

// Positive: real packages, an inline console destination next to them.
void startFlow({
  sources: {
    browser: {
      code: sourceBrowser,
      config: { settings: { pageview: true, prefix: 'data-elb' } },
    },
  },
  destinations: {
    console: {
      code: {
        type: 'console',
        config: {},
        push(event: WalkerOS.Event) {
          void event;
        },
      },
      config: { settings: { anything: 1 } },
    },
    gtag: {
      code: destinationGtag,
      config: {
        settings: { ga4: { measurementId: 'G-XXXXXXXXXX' } },
        mapping: {
          order: {
            complete: { name: 'purchase', settings: { ga4: {} } },
          },
        },
      },
      env: { window: { gtag: () => undefined } },
    },
    api: {
      code: destinationAPI,
      config: {
        settings: {
          url: 'https://analytics.example.com/events',
          // Contextually typed callback: `data` needs no annotation.
          transform: (data) => JSON.stringify(data),
        },
      },
    },
  },
});

// Source: a setting the browser source does not have.
void startFlow({
  sources: {
    browser: {
      code: sourceBrowser,
      config: {
        settings: {
          // @ts-expect-error browser source has no session setting
          session: false,
        },
      },
    },
  },
});

// Source: a wrong value type.
void startFlow({
  sources: {
    browser: {
      code: sourceBrowser,
      config: {
        settings: {
          // @ts-expect-error pageview is a boolean
          pageview: 'yes',
        },
      },
    },
  },
});

// Destination: an unknown setting next to an untyped inline destination.
void startFlow({
  destinations: {
    console: { code: { type: 'console', config: {}, push: () => undefined } },
    gtag: {
      code: destinationGtag,
      config: {
        settings: {
          // @ts-expect-error gtag has no such setting
          nope: 1,
        },
      },
    },
  },
});

// Destination: a nested wrong value type.
void startFlow({
  destinations: {
    gtag: {
      code: destinationGtag,
      config: {
        settings: {
          ga4: {
            // @ts-expect-error measurementId is a string
            measurementId: 1,
          },
        },
      },
    },
  },
});

// Destination: mapping rule settings are typed too.
void startFlow({
  destinations: {
    gtag: {
      code: destinationGtag,
      config: {
        mapping: {
          order: {
            complete: {
              settings: {
                // @ts-expect-error gtag rule settings have no such key
                nope: {},
              },
            },
          },
        },
      },
    },
  },
});

// Destination: a callback setting is checked against its signature.
void startFlow({
  destinations: {
    api: {
      code: destinationAPI,
      config: {
        settings: {
          url: 'https://analytics.example.com/events',
          // @ts-expect-error transform returns data, not a function
          transform: () => () => undefined,
        },
      },
    },
  },
});

// A config declared in a separate variable, or checked with `satisfies`,
// widens `transport: 'beacon'` to `string`: it compiles as before typing.
const destinations = {
  api: {
    code: destinationAPI,
    config: {
      settings: {
        url: 'https://analytics.example.com/events',
        transport: 'beacon',
      },
    },
  },
};
void startFlow({ destinations });
const satisfied = {
  destinations: {
    api: {
      code: destinationAPI,
      config: {
        settings: {
          url: 'https://analytics.example.com/events',
          transport: 'beacon',
        },
      },
    },
  },
} satisfies Collector.InitConfig;
void startFlow(satisfied);
