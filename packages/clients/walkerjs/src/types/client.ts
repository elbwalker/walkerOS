import type { On, WalkerOS } from '@elbwalker/types';
import type { SessionConfig } from '@elbwalker/utils';
import type * as WebDestination from './destination';
import type * as Walker from './walker';

declare global {
  interface Window {
    elbwalker: Instance;
    walkerjs: Instance;
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

export interface Instance {
  push: Elb;
  config: Config;
}

export interface Elb extends WalkerOS.Elb {
  (
    event: 'walker destination',
    destination: WebDestination.Destination,
    config?: WebDestination.Config,
  ): void;
  (event: 'walker init', scope: Scope | Scope[]): void;
  (
    event: string | unknown,
    data?: PushData,
    options?: PushOptions,
    context?: PushContext,
    nested?: WalkerOS.Entities,
    custom?: WalkerOS.Properties,
  ): void;
}

export type ElbLayer = [
  string?,
  PushData?,
  PushOptions?,
  WalkerOS.OrderedProperties?,
  WalkerOS.Entities?,
  WalkerOS.Properties?,
];

export type PushData =
  | WalkerOS.PushData
  | WebDestination.Destination
  | ScopeType;

export type PushOptions =
  | WalkerOS.PushOptions
  | Walker.Trigger
  | WebDestination.Config
  | WalkerOS.SingleOrArray<On.Options>;

export type PushContext = WalkerOS.PushContext | Element;

export type Scope = Document | Element | HTMLElement;
export type ScopeType = Scope | Scope[];

export interface Config extends WalkerOS.Config {
  client: string;
  destinations: Destinations;
  elbLayer: ElbLayer;
  pageview: boolean;
  prefix: string;
  queue: WalkerOS.Events;
  session: false | SessionConfig;
  elb?: string;
  instance?: string;
}

export interface Destinations {
  [name: string]: WebDestination.Destination;
}
