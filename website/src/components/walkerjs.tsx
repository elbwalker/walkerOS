import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Elb, SourceWalkerjs } from '@elbwalker/walker.js';
import { createSourceWalkerjs } from '@elbwalker/walker.js';
import { destinationWebAPI } from '@elbwalker/destination-web-api';
import { taggingRegistry } from '@site/src/components/organisms/tagging';
import Tagger from '@elbwalker/tagger';

declare global {
  interface Window {
    alst: Elb.Fn;
    alstLayer: Elb.Layer;
    runnerjs: SourceWalkerjs.Instance;
  }
}

export const DataCollection = () => {
  const location = useLocation();

  useEffect(() => {
    // Setup demo walkerjs
    if (!window.walkerjs) {
      const { elb, instance } = createSourceWalkerjs({
        run: true,
        pageview: false,
        session: false,
        consent: { functional: true, marketing: true },
        user: { session: 's3ss10n' },
      });

      window.elb = elb;
      window.walkerjs = instance;

      // Destination Preview
      elb('walker destination', {
        push: (e) => {
          const previewId = e.context?.previewId?.[0];
          if (previewId) taggingRegistry.get(String(previewId))?.(e);
        },
      });
    } else {
      // new page load
      window.elb('walker run');
    }

    // Setup internal walkerjs
    if (!window.runnerjs) {
      window.alstLayer = [];
      const { elb: alst, instance } = createSourceWalkerjs({
        default: true,
        session: {},
        prefix: 'data-alst',
        elbLayer: window.alstLayer,
      });

      window.alst = alst;
      window.runnerjs = instance;

      // Destination Lama
      alst('walker destination', destinationWebAPI, {
        custom: {
          url: 'https://moin.p.elbwalkerapis.com/lama',
          transform: (event) => {
            return JSON.stringify({
              ...event,
              ...{
                projectId: 'RQGM6XJ',
              },
            });
          },
          transport: 'xhr',
        },
      });

      // Destination API
      alst('walker destination', destinationWebAPI, {
        custom: {
          url: 'https://europe-west1-walkeros-firebase-stack.cloudfunctions.net/ingest',
          transport: 'beacon',
        },
      });
    } else {
      // new page load
      window.alst('walker run');
    }
  }, [location]);

  return null;
};

export const tagger: ReturnType<typeof Tagger> = Tagger({
  prefix: 'data-alst',
});
