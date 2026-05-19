import type { Collector, Elb, WalkerOS } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

// Forward declare types to avoid circular imports
export type Scope = Element | Document;
export type Trigger = string;

// Browser-specific push interface (can be more flexible)
export interface BrowserPush<
  R = Promise<Elb.PushResult>,
> extends Elb.WalkerCommands<R, Collector.Config> {
  (event: WalkerOS.DeepPartialEvent): R;

  // Browser-specific commands (not in Elb.WalkerCommands)
  (event: 'walker init', scope: Scope | Scope[]): R;
  (event: 'walker run', state?: Partial<Collector.Instance>): R;

  // Browser-flexible event form
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
  | object // Flexible for browser source
  | IArguments; // Support for arguments object

// Browser-specific options
export type BrowserPushOptions = Trigger | string | object;

// Browser-specific context
export type BrowserPushContext = WalkerOS.OrderedProperties | Element;

// Re-export core types
export type PushResult = Elb.PushResult;
export type Layer = Elb.Layer | IArguments;

// Clean Push type for generic usage
export type Push = BrowserPush;
