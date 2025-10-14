import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { WalkerOS, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationAPI } from '@walkeros/web-destination-api';
import { taggingRegistry } from '@site/src/components/organisms/tagging';

declare global {
  interface Window {
    elb: WalkerOS.Elb;
    // walkerjs is declared elsewhere
    alst: WalkerOS.Elb;
    alstCollector: Collector.Instance;
  }
}

export const DataCollection = () => {
  const location = useLocation();

  useEffect(() => {
    // Setup demo walkerjs using new collector pattern
    if (!window.walkerjs) {
      startFlow({
        sources: {
          browser: {
            code: sourceBrowser,
            config: {
              settings: {
                pageview: false,
                session: false,
                prefix: 'data-elb',
                elb: 'elb',
              },
            },
            env: {
              window,
              document,
            },
          },
        },
        destinations: {
          preview: {
            code: {
              type: 'preview',
              config: {},
              push: async (event: WalkerOS.Event) => {
                const previewId = event.context?.previewId?.[0];
                if (previewId) taggingRegistry.get(String(previewId))?.(event);
              },
            },
          },
        },
        consent: { functional: true, marketing: true },
        user: { session: 's3ss10n' },
      }).then(({ collector, elb }) => {
        window.elb = elb;
        window.walkerjs = collector;
      });
    } else {
      // new page load - reinitialize DOM tracking
      window.elb('walker run');
    }

    // Setup internal analytics collector
    if (!window.alstCollector) {
      startFlow({
        sources: {
          browser: {
            code: sourceBrowser,
            config: {
              settings: {
                pageview: true,
                session: true,
                prefix: 'data-alst',
                elb: 'alst',
              },
            },
            env: {
              window,
              document,
            },
          },
        },
        destinations: {
          lama: {
            code: destinationAPI,
            config: {
              settings: {
                url: 'https://moin.p.elbwalkerapis.com/lama',
                transform: (event: WalkerOS.Event) => {
                  return JSON.stringify({
                    ...event,
                    projectId: 'RQGM6XJ',
                  });
                },
                transport: 'xhr',
              },
            },
          },
          api: {
            code: destinationAPI,
            config: {
              settings: {
                url: 'https://europe-west1-walkeros-firebase-stack.cloudfunctions.net/ingest',
                transport: 'beacon',
              },
            },
          },
        },
      }).then(({ collector, elb }) => {
        window.alst = elb;
        window.alstCollector = collector;
      });
    } else {
      // new page load
      window.alst('walker run');
    }
  }, [location]);

  return null;
};

// Simple tagger implementation for compatibility
// Create a tagger instance with data-alst prefix
export const tagger = (() => {
  const prefix = 'data-alst';

  return {
    entity: (name: string) => ({
      get: () => ({ [prefix]: name }),
    }),
    action: (trigger: string, action: string) => ({
      get: () => ({ [`${prefix}action`]: `${trigger}:${action}` }),
    }),
    property: (entity: string, property: string, value: string) => ({
      get: () => ({ [`${prefix}-${entity}`]: `${property}:${value}` }),
    }),
    context: (key: string, value: string) => ({
      get: () => ({ [`${prefix}context`]: `${key}:${value}` }),
    }),
    globals: (key: string, value: string) => ({
      get: () => ({ [`${prefix}globals`]: `${key}:${value}` }),
    }),
  };
})();
