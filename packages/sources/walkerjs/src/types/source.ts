import type { Hooks, WalkerOS } from '@elbwalker/types';
import type { SessionConfig } from '@elbwalker/utils';
import type { Destination, Config as DestConfig } from './destination';
import type { Fn, Layer } from './elb';
import type { Config as OnConfig } from './on';
import type { Events, Trigger } from './walker';

declare global {
  interface Window {
    elbwalker: Instance;
    walkerjs: Instance;
    elbLayer: Layer;
    dataLayer: WalkerEvent | unknown;
    elb: Fn;
  }
}

type WalkerEvent = Array<
  WalkerOS.Event & {
    walkerjs: true;
  }
>;

export interface Instance extends State, WalkerOS.Instance {
  config: Config;
  destinations: Destinations;
  version: string;
  push: Fn;
  getAllEvents: (scope: Element, prefix: string) => Events;
  getEvents: (target: Element, trigger: Trigger, prefix: string) => Events;
  getGlobals: () => WalkerOS.Properties;
  sessionStart: (options?: SessionStartOptions) => void | WalkerOS.SessionData;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
  on: OnConfig;
  timing: number;
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
  on?: OnConfig;
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
