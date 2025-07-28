import type {
  Collector as CoreCollector,
  Elb,
  Hooks,
  WalkerOS,
  Destination as WalkerOSDestination,
} from '@walkerOS/core';
import type { SessionConfig } from '../session';
import type { Destination, Config as DestConfig } from './destination';
import type { Layer } from './elb';
import type { Events, Trigger } from './walker';
import type { On } from '@walkerOS/core';

declare global {
  interface Window {
    elbwalker: Collector;
    walkerjs: Collector;
    elbLayer: Layer;
    dataLayer: WalkerOS.Events | unknown;
    elb: Elb.Fn<Promise<Elb.PushResult>>;
  }
}

export interface Collector extends Omit<CoreCollector.Instance, 'config'> {
  config: Config & CoreCollector.Config;
  destinations: Destinations;
  push: Elb.Fn<Promise<Elb.PushResult>>;
  getAllEvents: (scope: Element, prefix: string) => Events;
  getEvents: (target: Element, trigger: Trigger, prefix: string) => Events;
  getGlobals: () => WalkerOS.Properties;
  sessionStart: (
    options?: SessionStartOptions,
  ) => void | CoreCollector.SessionData;
  _visibilityState?: {
    observer: IntersectionObserver | undefined;
    timers: WeakMap<HTMLElement, number>;
    duration: number;
    elementConfigs?: WeakMap<
      HTMLElement,
      { multiple: boolean; blocked: boolean }
    >;
  };
}

export interface State {
  config: Config;
  destinations: Destinations;
}

export interface Config {
  dataLayer: boolean;
  dataLayerConfig: DestConfig;
  elbLayer: Layer;
  listeners: boolean;
  pageview: boolean;
  prefix: string;
  run: boolean;
  scope: Scope;
  session: false | SessionConfig;
  elb?: string;
  name?: string;
}

export interface InitConfig extends Partial<Config> {
  consent?: WalkerOS.Consent;
  custom?: WalkerOS.Properties;
  destinations?: WalkerOSDestination.InitDestinations;
  hooks?: Hooks.Functions;
  on?: On.OnConfig;
  tagging?: number;
  user?: WalkerOS.User;
}

export interface SessionStartOptions {
  config?: SessionConfig;
  data?: Partial<CoreCollector.SessionData>;
}

export interface Destinations {
  [name: string]: Destination;
}

export type Scope = Element | Document;
