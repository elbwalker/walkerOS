import type { Hooks, WalkerOS } from '@elbwalker/types';
import type { SessionConfig, SessionData } from '@elbwalker/utils';
import type * as On from './on';
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
    walkerjs: true;
  }
>;

export interface Instance extends State, WalkerOS.Instance {
  client: string;
  config: Config;
  destinations: Destinations;
  push: Elb;
  getAllEvents: (scope: Element, prefix: string) => Walker.Events;
  getEvents: (
    target: Element,
    trigger: Walker.Trigger,
    prefix: string,
  ) => Walker.Events;
  getGlobals: () => WalkerOS.Properties;
  sessionStart: (options?: SessionStartOptions) => void | SessionData;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
  on: On.Config;
  session: undefined | SessionData;
  timing: number;
}

export interface Config extends WalkerOS.Config {
  dataLayer: boolean;
  dataLayerConfig: WebDestination.Config;
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
  hooks?: Hooks.Functions;
  on?: On.Config;
  tagging?: number;
  user?: WalkerOS.User;
}

export interface Elb extends WalkerOS.Elb {
  (
    event: 'walker destination',
    destination: WebDestination.Destination | WebDestination.DestinationInit,
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
  (event: 'walker run', state?: Partial<State>): void;
  (
    event: 'walker on',
    type: 'consent',
    rules: WalkerOS.SingleOrArray<On.ConsentConfig>,
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
  | WebDestination.DestinationInit
  | Partial<State>
  | ScopeType;

export type PushOptions =
  | WalkerOS.PushOptions
  | Walker.Trigger
  | WalkerOS.SingleOrArray<On.Options>
  | WebDestination.Config;

export type PushContext = WalkerOS.PushContext | Element;

export type Scope = Document | Element | HTMLElement;
export type ScopeType = Scope | Scope[];

export interface SessionStartOptions {
  config?: SessionConfig;
  data?: Partial<SessionData>;
}

export interface Destinations {
  [name: string]: WebDestination.Destination;
}
