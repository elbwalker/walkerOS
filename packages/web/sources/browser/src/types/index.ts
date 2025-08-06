import type { Source } from '@walkeros/core';
import type { Elb, SessionConfig, SessionCallback } from '@walkeros/web-core';

// Export browser-specific elb types
export * from './elb';

// Browser source configuration extending core source config
export interface BrowserSourceConfig extends Source.Config {
  type: 'browser';
  settings: Settings;
}

export interface Settings extends Record<string, unknown> {
  prefix?: string;
  scope?: Element | Document;
  pageview?: boolean;
  session?: boolean | SessionConfig;
  elb?: string;
  elbLayer?: boolean | string | Elb.Layer;
}

// Re-export session types from web-core to avoid duplication
export type { SessionConfig, SessionCallback };

// ELB Layer types for async command handling
export type ELBLayer = Array<Elb.Layer | IArguments>;
export interface ELBLayerConfig {
  name?: string; // Property name for window.elbLayer (default: 'elbLayer')
}

declare global {
  interface Window {
    [key: string]: Elb.Layer | unknown;
  }
}

// Scope type for DOM operations
export type Scope = Document | Element;
