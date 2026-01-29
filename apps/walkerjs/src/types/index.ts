import type { Collector, Source, WalkerOS } from '@walkeros/core';
import type { SourceBrowser } from '@walkeros/web-source-browser';
import type { SourceDataLayer } from '@walkeros/web-source-datalayer';
import type { SourceSession } from '@walkeros/web-source-session';

declare global {
  interface Window {
    [key: string]: DataLayer;
  }
}

// Instance interface
export interface Instance {
  collector: Collector.Instance;
  elb: SourceBrowser.BrowserPush;
}

// Configuration interface
export interface Config {
  // Collector configuration
  collector?: Collector.InitConfig;

  // Browser source configuration
  browser?: Partial<SourceBrowser.Settings>;

  // Session source configuration
  session?: boolean | Partial<SourceSession.Settings>;

  // DataLayer configuration
  dataLayer?: boolean | Partial<SourceDataLayer.Settings>;

  // Global configuration
  elb?: string; // Name for the global elb function
  name?: string; // Name for the global instance
  run?: boolean; // Auto-run on initialization (default: true)
}

export type DataLayer = undefined | Array<unknown>;
