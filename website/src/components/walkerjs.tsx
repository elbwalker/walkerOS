import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { elb, Walkerjs } from '@elbwalker/walker.js';
import { destinationWebAPI } from '@elbwalker/destination-web-api';
import Tagger from '@elbwalker/tagger';
import { taggingRegistry } from './organisms/tagging';

export const DataCollection = () => {
  const location = useLocation();

  useEffect(() => {
    if (!window.walkerjs) {
      // Setup walkerjs
      window.elb = elb;
      window.walkerjs = Walkerjs({
        default: true,
        session: {},
      });

      // Destination Lama
      elb('walker destination', destinationWebAPI, {
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
      elb('walker destination', destinationWebAPI, {
        custom: {
          url: 'https://europe-west1-walkeros-firebase-stack.cloudfunctions.net/ingest',
          transport: 'beacon',
        },
      });

      // Destination Preview
      elb('walker destination', {
        push: (e) => {
          const previewId = e.context?.previewId?.[0];
          if (previewId) taggingRegistry.get(String(previewId))?.(e);
        },
      });
    } else {
      // new page load
      elb('walker run');
    }
  }, [location]);

  return null;
};

export const tagger = Tagger({ prefix: 'data-alst' });
