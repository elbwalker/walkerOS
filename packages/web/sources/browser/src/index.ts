import type { WalkerOS } from '@walkerOS/core';
import type { Settings, Source } from './types';
import { load, ready, initGlobalTrigger } from './trigger';
import { destroyVisibilityTracking } from './triggerVisible';
import { initELBLayer } from './elbLayer';

export * from './types';

// Main browser source configuration
export interface SourceBrowser extends Source {
  type: 'browser';
}

// Source initialization function
const initSourceBrowser = async (
  collector: WalkerOS.Collector,
  config: WalkerOS.CollectorSourceConfig,
) => {
  const { settings } = config as { settings: Settings };
  const prefix = settings.prefix || 'data-elb';
  const scope = (settings.scope as Document | Element) || document;

  // Initialize ELB Layer for async command handling
  if (settings.elbLayer !== false) {
    initELBLayer(collector, {
      name:
        typeof settings.elbLayer === 'string' ? settings.elbLayer : 'elbLayer',
    });
  }

  // Initialize global event listeners (click, submit)
  initGlobalTrigger(collector, scope);

  // Setup auto-initialization via ready state
  await ready(collector, () => {
    // Load triggers and run initialization
    load(collector, prefix, scope, settings.pageview);
  });

  // Setup cleanup for visibility tracking on collector destroy
  const originalDestroy = (collector as any)._destroy;
  (collector as any)._destroy = () => {
    destroyVisibilityTracking(collector);
    if (originalDestroy) originalDestroy();
  };
};

// Browser source factory function
export function sourceBrowser(init: Partial<Settings> = {}): SourceBrowser {
  return {
    type: 'browser',
    init: initSourceBrowser,
    settings: {
      prefix: 'data-elb',
      scope: document,
      pageview: true,
      session: true,
      run: true,
      listeners: true,
      elbLayer: 'elbLayer', // Default ELB layer name
      ...init,
    },
  } as SourceBrowser;
}

export default sourceBrowser;
