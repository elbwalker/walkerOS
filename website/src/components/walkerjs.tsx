import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { elb, Walkerjs } from '@elbwalker/walker.js';
import { destinationWebAPI } from '@elbwalker/destination-web-api';
import Tagger from '@elbwalker/tagger';
import { sessionStart } from '@elbwalker/utils';

export const Walkerjs = () => {
  const location = useLocation();

  useEffect(() => {
    if (!window.walkerjs) {
      // Setup walkerjs
      window.elb = elb;
      window.walkerjs = Walkerjs({
        default: true,
      });

      // Session
      const session = sessionStart();
      if (session) elb('session start', session);

      // Destination Lama
      window.walkerjs.push('walker destination', destinationWebAPI, {
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
      window.walkerjs.push('walker destination', destinationWebAPI, {
        custom: {
          url: 'https://europe-west1-walkeros-firebase-stack.cloudfunctions.net/ingest',
          transport: 'beacon',
        },
      });
    } else {
      // new page load
      elb('walker run');
    }
  }, [location]);

  return null;
};

export const tagger = Tagger();
