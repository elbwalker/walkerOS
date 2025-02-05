import type { Hooks, WalkerOS } from '@elbwalker/types';
import type { SessionConfig } from '@elbwalker/utils';
import type { Elb, On, Walker, DestinationWeb } from '.';

declare global {
  interface Window {
    elbwalker: Instance;
    walkerjs: Instance;
    elbLayer: Elb.Layer;
    dataLayer: WalkerEvent | unknown;
    elb: Elb.Fn;
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
  push: Elb.Fn;
  getAllEvents: (scope: Element, prefix: string) => Walker.Events;
  getEvents: (
    target: Element,
    trigger: Walker.Trigger,
    prefix: string,
  ) => Walker.Events;
  getGlobals: () => WalkerOS.Properties;
  sessionStart: (options?: SessionStartOptions) => void | WalkerOS.SessionData;
}

export interface State extends WalkerOS.State {
  config: Config;
  destinations: Destinations;
  on: On.Config;
  timing: number;
}

export interface Config extends WalkerOS.Config {
  dataLayer: boolean;
  dataLayerConfig: DestinationWeb.Config;
  elbLayer: Elb.Layer;
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
  on?: On.Config;
  tagging?: number;
  user?: WalkerOS.User;
}

export interface SessionStartOptions {
  config?: SessionConfig;
  data?: Partial<WalkerOS.SessionData>;
}

export interface Destinations {
  [name: string]: DestinationWeb.Destination;
}
