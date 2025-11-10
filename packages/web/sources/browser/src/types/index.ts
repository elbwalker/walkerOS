import type { Source, Elb, Collector } from '@walkeros/core';
import type { SessionConfig, SessionCallback } from '@walkeros/web-core';
import type { SettingsSchema } from '../schemas';
import { z } from '@walkeros/core';

// Export browser-specific elb types
export * from './elb';
import type { BrowserPush } from './elb';

// Base settings from Zod schema
type BaseSettings = z.infer<typeof SettingsSchema>;

// InitSettings: what users provide (all optional)
// Override specific fields with non-serializable types
export interface InitSettings
  extends Partial<Omit<BaseSettings, 'scope' | 'session' | 'elbLayer'>> {
  scope?: Element | Document;
  session?: boolean | SessionConfig;
  elbLayer?: boolean | string | Elb.Layer;
}

// Settings: resolved configuration
// Override specific fields with non-serializable types
export interface Settings
  extends Omit<BaseSettings, 'scope' | 'session' | 'elbLayer'> {
  scope?: Element | Document;
  session: boolean | SessionConfig;
  elbLayer: boolean | string | Elb.Layer;
}

export interface Mapping {}

export type Push = BrowserPush;

export interface Env extends Source.BaseEnv {
  elb: Elb.Fn;
  window?: Window & typeof globalThis;
  document?: Document;
}

export type Types = Source.Types<Settings, Mapping, Push, Env>;

export interface Context {
  elb: Elb.Fn;
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
