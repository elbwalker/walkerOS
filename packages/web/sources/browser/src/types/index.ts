import type { Source, Elb, Logger } from '@walkeros/core';
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
  Omit<BaseSettings, 'scope' | 'elbLayer' | 'elb'>
> {
  scope?: InitScope;
  elbLayer?: boolean | string | Elb.Layer;
  elb?: string | false;
}

// Settings: resolved configuration
// Override specific fields with non-serializable types
export interface Settings extends Omit<
  BaseSettings,
  'scope' | 'elbLayer' | 'elb'
> {
  scope?: InitScope;
  elbLayer: boolean | string | Elb.Layer;
  elb: string | false;
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
  // Every mutable trigger container this source owns. Required: an optional
  // field with a module-level fallback would put the containers back in module
  // scope, which is the state parallel sources must not share.
  registry: Registry;
  logger?: Logger.Instance;
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
  observed: Set<HTMLElement>; // elements registered on this source's doc observer
  registered: Set<HTMLElement>; // every element this scope has wired triggers for
  mutationObservers: MutationObserver[]; // this scope's observe-container observers
}

// Per-element teardown record. The reaper reads this to release exactly ONE
// element's resources (its pulse intervals, its wait timeouts, its hover
// listener, its visibility observation, its scroll entry) without touching the
// rest of the scope. `scope` is the owning scope key: it selects both the owner
// bucket (via Registry.scopes) and the unobserveElement key, so an element
// removed inside a different scope's subtree is still released from its true
// owner.
export interface ElementRegistration {
  scope: InitScope;
  intervalIds: ReturnType<typeof setInterval>[];
  timeoutIds: ReturnType<typeof setTimeout>[];
  hoverAbort?: AbortController;
  scroll: boolean; // presence flag: the element itself keys into bucket.scrollElements
  observed: boolean; // presence flag: the element itself keys into bucket.observed
}

// One `impression` or `visible` registration on an element. An element carries
// at most one of each.
export interface ElementConfig {
  multiple: boolean;
  blocked: boolean;
  context: Context;
  trigger: string;
}

// One document's visibility tracking. Owned by a single source, so two sources
// watching the same document hold two of these and neither can disconnect,
// re-time or blind the other.
export interface VisibilityState {
  observer?: IntersectionObserver;
  resizeObserver?: ResizeObserver;
  timers: WeakMap<HTMLElement, number>;
  duration: number;
  configs: WeakMap<HTMLElement, ElementConfig[]>;
  // Elements last seen without a layout box. A 0x0 target reports ratio 1, so
  // growing one into view never changes the threshold index and the observer
  // stays silent; the ResizeObserver re-observes to force a fresh entry.
  zeroArea: WeakSet<HTMLElement>;
}

// Every mutable trigger container one source owns. One registry per source
// instance, carried on Context and spread by reference into scope-aligned
// contexts, so `walker run` and `walker init <el>` of the SAME source share it
// (which is what keeps intra-source element dedup working) while two sources
// share nothing.
export interface Registry {
  // Root listeners for this source's settings.scope: the deferred DOM-ready
  // hook until the DOM is ready, then click/submit delegation. Aborting it
  // cancels whichever is armed.
  root?: AbortController;
  // One bucket per scope this source init'd. Iterable on purpose: teardown must
  // enumerate every active scope to reach sub-scope intervals and observers.
  // Holds strong references to init'd scope nodes, bounded by the page session.
  scopes: Map<InitScope, ScopeState>;
  // Has THIS source wired this element? The authority for intra-source dedup.
  // Not enumerable, so ScopeState.registered is its enumerable companion:
  // el in bucket.registered <=> elements.get(el).scope === that bucket's scope.
  elements: WeakMap<HTMLElement, ElementRegistration>;
  // One IntersectionObserver state per document, for this source alone.
  visibility: WeakMap<Document, VisibilityState>;
  // Set by teardown. The collector keeps a destroyed source reachable and work
  // deferred past init (the DOM-ready hook) still fires, so every path that
  // wires, scans or emits reads this first.
  destroyed: boolean;
}
