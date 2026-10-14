import type { Collector, Elb, WalkerOS } from '@walkeros/core';
// `./scope` is a leaf module (DOM globals only), so importing from it keeps this
// file free of the circular import that the forward declarations below avoid.
import type { InitScope } from './scope';

export type Trigger = string;

// Browser push: an event object, a walker command, or the string form, which
// is exactly `{ name, data }`. Trigger, context, nested and custom go inside
// the event object.
export interface BrowserPush<
  R = Promise<Elb.PushResult>,
> extends Elb.WalkerCommands<R, Collector.Config> {
  (event: WalkerOS.DeepPartialEvent): R;

  // Browser-specific commands (not in Elb.WalkerCommands)
  (event: 'walker init', scope: InitScope | InitScope[]): R;
  (event: 'walker run', state?: Partial<Collector.Instance>): R;

  (event: string, data?: WalkerOS.Properties): R;
}

// Re-export core types
export type PushResult = Elb.PushResult;
export type Layer = Elb.Layer | IArguments;

// Clean Push type for generic usage
export type Push = BrowserPush;
