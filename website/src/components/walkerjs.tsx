import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { elb, webClient } from '@elbwalker/walker.js';
import { destinationWebAPI } from '@elbwalker/destination-web-api';
import Tagger from '@elbwalker/tagger';

export const Walkerjs = () => {
  const location = useLocation();

  useEffect(() => {
    if (!window.walkerjs) {
      // Setup walkerjs
      window.elb = elb;
      window.walkerjs = webClient({
        default: true,
      });

      // Destination API
      window.walkerjs.push('walker destination', destinationWebAPI, {
        custom: {
          url: 'https://moin.p.elbwalkerapis.com/lama',
          transport: 'xhr',
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
