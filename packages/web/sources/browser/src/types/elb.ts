import type { Collector, Elb, WalkerOS } from '@walkerOS/core';
import type { DestinationWeb } from '@walkerOS/web-core';

// Forward declare types to avoid circular imports
export type Scope = Element | Document;
export type Trigger = string;

// Browser-specific push interface (can be more flexible)
export interface BrowserPush<R = Promise<Elb.PushResult>> {
  // Core collector interface
  (event: WalkerOS.DeepPartialEvent): R;

  // Walker commands
  (event: 'walker config', config: Partial<Collector.Config>): R;
  (event: 'walker consent', consent: WalkerOS.Consent): R;
  <K extends keyof import('@walkerOS/core').Hooks.Functions>(
    event: 'walker hook',
    name: K,
    hookFn: import('@walkerOS/core').Hooks.Functions[K],
  ): R;
  (event: 'walker user', user: WalkerOS.User): R;

  // Browser-specific commands
  (event: 'walker init', scope: Scope | Scope[]): R;
  (
    event: 'walker destination',
    destination: DestinationWeb.Destination | DestinationWeb.Init,
    config?: DestinationWeb.Config,
  ): R;
  (event: 'walker run', state?: Partial<Collector.Instance>): R;

  // Flexible arguments
  (
    event?: unknown,
    data?: BrowserPushData,
    options?: BrowserPushOptions,
    context?: BrowserPushContext,
    nested?: WalkerOS.Entities,
    custom?: WalkerOS.Properties,
  ): R;
}

// Browser-specific flexible arguments
export type BrowserArguments<R = Promise<Elb.PushResult>> = (
  event?: unknown,
  data?: BrowserPushData,
  options?: BrowserPushOptions,
  context?: BrowserPushContext,
  nested?: WalkerOS.Entities,
  custom?: WalkerOS.Properties,
) => R;

// Browser-specific data types
export type BrowserPushData =
  | Elb.PushData // Core types
  | DestinationWeb.Destination
  | DestinationWeb.Init // Web-specific
  | Scope
  | Array<Scope> // Web-specific
  | Trigger // Web-specific
  | string
  | object; // Flexible for browser source

// Browser-specific options
export type BrowserPushOptions =
  | Trigger
  | DestinationWeb.Config
  | string
  | object;

// Browser-specific context
export type BrowserPushContext = WalkerOS.OrderedProperties | Element;

// Browser-specific commands
export type BrowserCommands<R = Promise<Elb.PushResult>> =
  | CommandInit<R>
  | CommandDestination<R>
  | CommandRun<R>;

export type CommandInit<R = Promise<Elb.PushResult>> = (
  event: 'walker init',
  scope: Scope | Scope[],
) => R;

export type CommandDestination<R = Promise<Elb.PushResult>> = (
  event: 'walker destination',
  destination: DestinationWeb.Destination | DestinationWeb.Init,
  config?: DestinationWeb.Config,
) => R;

export type CommandRun<R = Promise<Elb.PushResult>> = (
  event: 'walker run',
  state?: Partial<Collector.Instance>,
) => R;

// Re-export core types
export type PushResult = Elb.PushResult;
export type Layer = Elb.Layer;
