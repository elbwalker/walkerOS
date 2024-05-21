import type { Hooks, On, WalkerOS } from '@elbwalker/types';
import type { SessionConfig, SessionData } from '@elbwalker/utils';
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

export interface Instance extends State, WalkerOS.Instance {
  push: Elb;
  client: string;
  config: Config;
  destinations: Destinations;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
  session: undefined | SessionData;
  timing: number;
}

export interface Config extends WalkerOS.Config {
  dataLayer: boolean;
  elbLayer: ElbLayer;
  pageview: boolean;
  prefix: string;
  run: boolean;
  session: false | SessionConfig;
  globalsStatic: WalkerOS.Properties;
  sessionStatic: Partial<SessionData>;
  elb?: string;
  instance?: string;
}

export interface InitConfig extends Partial<Config> {
  consent?: WalkerOS.Consent;
  custom?: WalkerOS.Properties;
  destinations?: Destinations;
  group?: string;
  hooks?: Hooks.Functions;
  on?: On.Config;
  tagging?: number;
  user?: WalkerOS.User;
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

export interface Destinations {
  [name: string]: WebDestination.Destination;
}
