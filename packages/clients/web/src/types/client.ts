import type { WalkerOS } from '@elbwalker/types';
import type * as WebDestination from './destination';
import type * as Walker from './walker';

declare global {
  interface Window {
    elbwalker: Function;
    walkerjs: Function;
    elbLayer: ElbLayer;
    dataLayer: WalkerEvent | unknown;
    elb: Elb;
  }
}

type WalkerEvent = Array<
  WalkerOS.Event & {
    walker: true;
  }
>;

export interface Function {
  push: Elb;
  config: Config;
}

export interface Elb extends WalkerOS.Elb {
  (
    event: 'walker destination',
    destination: WebDestination.Function,
    config?: WebDestination.Config,
  ): void;
  (event: 'walker init', scope: Scope | Scope[]): void;
  (
    event: string,
    data?: PushData,
    options?: PushOptions,
    context?: PushContext,
    nested?: WalkerOS.Entities,
  ): void;
}

export type ElbLayer = [
  (IArguments | string)?,
  PushData?,
  PushOptions?,
  WalkerOS.OrderedProperties?,
  WalkerOS.Entities?,
];

export type PushData = WalkerOS.PushData | WebDestination.Function | ScopeType;

export type PushOptions =
  | WalkerOS.PushOptions
  | Walker.Trigger
  | WebDestination.Config;

export type PushContext = WalkerOS.PushContext | Element;

export type Scope = Document | Element | HTMLElement;
export type ScopeType = Scope | Scope[];

export interface Config extends WalkerOS.Config {
  destinations: Destinations;
  elbLayer: ElbLayer;
  pageview: boolean;
  prefix: string;
  queue: WalkerOS.Events;
}

export interface Destinations {
  [name: string]: WebDestination.Function;
}
