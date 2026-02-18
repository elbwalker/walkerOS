import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { WalkerOS, Collector, Elb } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationAPI } from '@walkeros/web-destination-api';

declare global {
  interface Window {
    alst: Elb.Fn;
    alstCollector: Collector.Instance;
    elb: Elb.Fn;
    walkerjs: Collector.Instance;
  }
}

export const DataCollection = () => {
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      // Setup demo walkerjs using new collector pattern
      if (!window.walkerjs) {
        const { collector, elb } = await startFlow({
          sources: {
            browser: {
              code: sourceBrowser,
              config: {
                settings: {
                  pageview: false,
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
          destinations: {},
          consent: { functional: true, marketing: true },
          user: { session: 's3ss10n' },
        });
        window.elb = elb;
        window.walkerjs = collector;
      } else {
        // new page load - reinitialize DOM tracking
        window.elb('walker run');
      }

      // Setup internal analytics collector
      if (!window.alstCollector) {
        const { collector, elb } = await startFlow({
          sources: {
            browser: {
              code: sourceBrowser,
              config: {
                settings: {
                  pageview: true,
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
        });
        window.alst = elb;
        window.alstCollector = collector;
      } else {
        // new page load
        window.alst('walker run');
      }
    };

    init();
  }, [location]);

  return null;
};

// Simple tagger that returns spread-friendly attribute objects
export const tagger = (() => {
  const prefix = 'data-alst';

  return {
    entity: (name: string) => ({ [prefix]: name }),
    action: (value: string) => ({ [`${prefix}-action`]: value }),
    property: (key: string, value: string) => ({
      [`${prefix}-property`]: `${key}:${value}`,
    }),
    context: (key: string, value: string) => ({
      [`${prefix}-context`]: `${key}:${value}`,
    }),
    globals: (key: string, value: string) => ({
      [`${prefix}-globals`]: `${key}:${value}`,
    }),
  };
})();
