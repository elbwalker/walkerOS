import type { Source, WalkerOS } from '@walkerOS/core';
import type { SourceBrowser } from '@walkerOS/web-source-browser';
import type { SourceDataLayer } from '@walkerOS/web-source-dataLayer';

declare global {
  interface Window {
    [key: string]: DataLayer;
  }
}

// Instance interface
export interface Instance {
  collector: WalkerOS.Collector;
  elb: SourceBrowser.BrowserPush;
}

// Configuration interface
export interface Config {
  // Collector configuration
  collector?: WalkerOS.InitConfig;

  // Browser source configuration
  browser?: Partial<SourceBrowser.Settings>;

  // DataLayer configuration
  dataLayer?: boolean | Partial<SourceDataLayer.Settings>;

  // Global configuration
  elb?: string; // Name for the global elb function
  name?: string; // Name for the global instance
  run?: boolean; // Auto-run on initialization (default: true)
}

export type DataLayer = undefined | Array<unknown>;
