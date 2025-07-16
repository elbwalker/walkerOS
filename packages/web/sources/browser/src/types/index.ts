import type { Mapping as WalkerOSMapping, WalkerOS } from '@walkerOS/core';
import type { Walker, Elb } from '@walkerOS/web-core';

// Export browser-specific elb types
export * from './elb';

export interface Source extends WalkerOS.CollectorSource {
  type: 'browser';
  init?: (
    collector: WalkerOS.Collector,
    config: WalkerOS.CollectorSourceConfig,
  ) => void | Promise<void>;
  settings?: Settings;
  mapping?: Mapping;
}

export interface Config {
  settings: Settings;
  mapping?: Mapping;
}

export interface Settings extends Record<string, unknown> {
  prefix?: string;
  scope?: Element | Document;
  listeners?: boolean;
  pageview?: boolean;
  session?: boolean;
  elb?: string;
  name?: string;
  dataLayer?: boolean;
  dataLayerConfig?: unknown;
  run?: boolean;
  elbLayer?: boolean | string | Elb.Layer;
}

// ELB Layer types for async command handling
export type ELBLayer = Elb.Layer;
export interface ELBLayerConfig {
  name?: string; // Property name for window.elbLayer (default: 'elbLayer')
}

declare global {
  interface Window {
    [key: string]: Elb.Layer | unknown;
  }
}

// Source-to-collector mapping rules
export interface Mapping {
  // Transform source events to collector format
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;

// Re-export Walker types for backward compatibility
export type Trigger = Walker.Trigger;
export type WalkerEvent = Walker.Event;
export type Events = Walker.Events;
export type Filter = Walker.Filter;
export interface TriggerAction {
  trigger: string;
  triggerParams?: string;
  action: string;
  actionParams?: string;
}
export type TriggerActions = Walker.TriggerActions;
export type TriggersActionGroups = Walker.TriggersActionGroups;
export type ScrollElements = Walker.ScrollElements;
export type Attributes = Walker.Attributes;
export type KeyVal = Walker.KeyVal;

// Scope type for DOM operations
export type Scope = Document | Element;
