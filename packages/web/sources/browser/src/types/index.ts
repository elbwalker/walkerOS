import type { Source, Elb } from '@walkeros/core';
import type { SessionConfig, SessionCallback } from '@walkeros/web-core';

// Export browser-specific elb types
export * from './elb';

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
  prefix: string;
  scope?: Element | Document;
  pageview: boolean;
  session: boolean | SessionConfig;
  elb: string;
  elbLayer: boolean | string | Elb.Layer;
}

export interface Mapping {}

export type Push = Elb.Fn;

export interface Env extends Source.BaseEnv {
  window?: Window & typeof globalThis;
  document?: Document;
}

export type Types = Source.Types<Settings, Mapping, Push, Env>;

// Context for translation functions with elb and settings
export interface Context {
  elb: Elb.Fn; // Direct elb access
  settings: Settings;
}

// Re-export session types from web-core to avoid duplication
export type { SessionConfig, SessionCallback };

// ELB Layer types for async command handling
export type ELBLayer = Array<Elb.Layer | IArguments>;
export interface ELBLayerConfig {
  name?: string; // Property name for window.elbLayer (default: 'elbLayer')
}

// Scope type for DOM operations
export type Scope = Document | Element;
