import type { Source, Collector } from '@walkeros/core';
import type { Elb, SessionConfig, SessionCallback } from '@walkeros/web-core';

// Export browser-specific elb types
export * from './elb';

// Browser source configuration extending core source config
export interface BrowserSourceConfig extends Source.Config {
  type: 'browser';
  settings: InitSettings;
}

// InitSettings: what users provide (all optional)
export interface InitSettings extends Record<string, unknown> {
  prefix?: string;
  scope?: Element | Document;
  pageview?: boolean;
  session?: boolean | SessionConfig;
  elb?: string;
  elbLayer?: boolean | string | Elb.Layer;
}

// Settings: resolved configuration (required fields are actually required)
export interface Settings extends Record<string, unknown> {
  prefix: string; // Always required after resolution
  scope: Element | Document; // Always required after resolution
  pageview: boolean; // Always required after resolution (defaults to false)
  session: boolean | SessionConfig; // Always required after resolution (defaults to false)
  elb: string; // Always required after resolution (defaults to '')
  elbLayer: boolean | string | Elb.Layer; // Always required after resolution (defaults to false)
}

// Context for translation functions with collector and settings
export interface Context {
  collector: Collector.Instance;
  settings: Settings;
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
