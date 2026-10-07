import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Collector, Elb } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';

declare global {
  interface Window {
    alst: Elb.Fn;
    elb: Elb.Fn;
    walkerjs: Collector.Instance;
  }
}

// Hosted analytics bundle (self-initializing IIFE that exposes window.alst).
const ANALYTICS_BUNDLE_SRC = 'https://cdn.walkeros.io/d/x1fsqqucg526/walker.js';
let analyticsScriptInjected = false;

export const DataCollection = () => {
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      // Setup demo walkerOS flow
      if (!window.walkerjs) {
        const { collector, elb } = await startFlow({
          sources: {
            browser: {
              code: sourceBrowser,
              config: {
                settings: {
                  pageview: false,
                },
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

      // Load hosted analytics bundle (self-initializing IIFE).
      if (!analyticsScriptInjected) {
        analyticsScriptInjected = true;
        const script = document.createElement('script');
        script.async = true;
        script.src = ANALYTICS_BUNDLE_SRC;
        // If the CDN request fails (blocked, offline, 5xx), clear the flag so a
        // later navigation can retry injection instead of leaving analytics
        // dead for the rest of the session.
        script.onerror = () => {
          analyticsScriptInjected = false;
        };
        document.head.appendChild(script);
      } else if (typeof window.alst === 'function') {
        // new page load - re-scan the DOM for the new page
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
