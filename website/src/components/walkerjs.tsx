import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
// import { elb, webClient } from '@elbwalker/walker.js';
import Tagger from '@elbwalker/tagger';

export const Walkerjs = () => {
  const location = useLocation();

  useEffect(() => {
    // @TODO - uncomment when walkerjs is ready
    //   if (!window.walkerjs) {
    //     // Setup walkerjs
    //     window.elb = elb;
    //     window.walkerjs = webClient({ default: true });
    //   } else {
    //     // new page load
    //     elb('walker run');
    //   }
  }, [location]);

  return null;
};

export const tagger = Tagger();
