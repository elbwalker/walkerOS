import type { Source, Elb } from '@walkeros/core';
import type { Walker } from '@walkeros/web-core';
import type { SettingsSchema } from '../schemas';
import type { z } from '@walkeros/core/dev';

// Export browser-specific elb types
export * from './elb';
import type { BrowserPush } from './elb';

declare module '@walkeros/core' {
  interface SourceMap {
    browser: {
      type: 'browser';
      platform: 'web';
      url?: string;
      referrer?: string;
    };
  }
}

// Base settings from Zod schema
type BaseSettings = z.infer<typeof SettingsSchema>;

// InitSettings: what users provide (all optional)
// Override specific fields with non-serializable types
export interface InitSettings extends Partial<
  Omit<BaseSettings, 'scope' | 'elbLayer'>
> {
  scope?: InitScope;
  elbLayer?: boolean | string | Elb.Layer;
}

// Settings: resolved configuration
// Override specific fields with non-serializable types
export interface Settings extends Omit<BaseSettings, 'scope' | 'elbLayer'> {
  scope?: InitScope;
  elbLayer: boolean | string | Elb.Layer;
}

export interface Mapping {}

export type Push = BrowserPush;

export interface Env extends Source.BaseEnv {
  elb: Elb.Fn;
  window?: Window & typeof globalThis;
  document?: Document;
}

export type Types = Source.Types<Settings, Mapping, Push, Env, InitSettings>;

export type Config = Source.Config<Types>;

export interface Context {
  elb: Elb.Fn;
  settings: Settings;
  // Scope travels in context.settings.scope; the implementation reads it from
  // there. Called with a single, scope-aligned context for `walker init`.
  initScope?: (context: Context) => void;
}

// Scope types live in the leaf `./scope` module so `types/elb.ts` can reuse
// them without a circular import. Imported for local use (Settings.scope below)
// and re-exported so `SourceBrowser.Scope` / `.InitScope` stay part of the
// public surface.
export type { Scope, InitScope } from './scope';
import type { InitScope } from './scope';

// Everything a single scope's init installs, bucketed so a re-init can tear the
// scope's prior state down before attaching fresh. Keyed by the scope node, so
// `walker run` (document) and `walker init <el>` (element) own independent
// buckets that never reach into each other.
export interface ScopeState {
  abort: AbortController; // this scope's scroll listener (hover is per-element)
  intervalIds: ReturnType<typeof setInterval>[]; // pulse
  timeoutIds: ReturnType<typeof setTimeout>[]; // wait
  scrollElements: Walker.ScrollElements; // this scope's scroll targets
  scrollListener?: EventListenerOrEventListenerObject;
  observed: Set<HTMLElement>; // elements registered on the shared per-doc observer
  registered: Set<HTMLElement>; // every element this scope has wired triggers for
  mutationObservers: MutationObserver[]; // this scope's observe-container observers
}
