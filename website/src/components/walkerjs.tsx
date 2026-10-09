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
// The demo flow's own elb. window.elb can belong to another flow on the
// page (the hosted bundle may set it), so route changes run the demo flow
// through this one.
let demoElb: Elb.Fn | undefined;

/** Runs on the first page and on every route change after it. */
export async function onRouteChange(): Promise<void> {
  // Setup demo walkerOS flow
  if (!demoElb) {
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
    demoElb = elb;
    window.elb = elb;
    window.walkerjs = collector;
  } else {
    // new page load - reinitialize DOM tracking
    demoElb('walker run');
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
}

export const DataCollection = () => {
  const location = useLocation();

  useEffect(() => {
    onRouteChange();
  }, [location]);

  return null;
};
