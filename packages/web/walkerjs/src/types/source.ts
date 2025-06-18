import type { Hooks, WalkerOS } from '@walkerOS/types';
import type { SessionConfig } from '@walkerOS/web';
import type { Destination, Config as DestConfig } from './destination';
import type { Fn, Layer } from './elb';
import type { Events, Trigger } from './walker';

declare global {
  interface Window {
    elbwalker: Instance;
    walkerjs: Instance;
    elbLayer: Layer;
    dataLayer: WalkerOS.Events | unknown;
    elb: Fn;
  }
}

export interface Instance extends WalkerOS.Instance {
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
  globalsStatic: WalkerOS.Properties;
  sessionStatic: Partial<WalkerOS.SessionData>;
  elb?: string;
  instance?: string;
}

export interface InitConfig extends Partial<Config> {
  consent?: WalkerOS.Consent;
  custom?: WalkerOS.Properties;
  destinations?: Destinations;
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
