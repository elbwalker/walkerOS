import type {
  Hooks,
  WalkerOS,
  Destination as WalkerOSDestination,
} from '@walkerOS/core';
import type { SessionConfig } from '../utils';
import type { Destination, Config as DestConfig } from './destination';
import type { Fn, Layer } from './elb';
import type { Events, Trigger } from './walker';

declare global {
  interface Window {
    elbwalker: Collector;
    walkerjs: Collector;
    elbLayer: Layer;
    dataLayer: WalkerOS.Events | unknown;
    elb: Fn;
  }
}

export interface Collector extends WalkerOS.Collector {
  config: Config;
  destinations: Destinations;
  push: Fn;
  getAllEvents: (scope: Element, prefix: string) => Events;
  getEvents: (target: Element, trigger: Trigger, prefix: string) => Events;
  getGlobals: () => WalkerOS.Properties;
  sessionStart: (options?: SessionStartOptions) => void | WalkerOS.SessionData;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
}

export interface Config extends WalkerOS.Config {
  dataLayer: boolean;
  dataLayerConfig: DestConfig;
  elbLayer: Layer;
  pageview: boolean;
  prefix: string;
  run: boolean;
  session: false | SessionConfig;
  elb?: string;
  name?: string;
}

export interface InitConfig extends Partial<Config> {
  consent?: WalkerOS.Consent;
  custom?: WalkerOS.Properties;
  destinations?: WalkerOSDestination.InitDestinations;
  hooks?: Hooks.Functions;
  on?: WalkerOS.OnConfig;
  tagging?: number;
  user?: WalkerOS.User;
}

export interface SessionStartOptions {
  config?: SessionConfig;
  data?: Partial<WalkerOS.SessionData>;
}

export interface Destinations {
  [name: string]: Destination;
}
