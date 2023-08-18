import type { Elbwalker, Walker, WebDestination } from '@elbwalker/types';

declare global {
  interface Window {
    elbwalker: Function;
    elbLayer: ElbLayer;
    dataLayer: WalkerEvent;
    elb: Elb;
  }
}

type WalkerEvent = Array<
  Elbwalker.Event & {
    walker: true;
  }
>;

export interface Function {
  push: Elb;
  config: Config;
}

export interface Elb extends Elbwalker.Elb {
  (
    event: 'walker destination',
    destination: WebDestination.Function<any, any>,
    config?: WebDestination.Config,
  ): void;
  (event: 'walker init', scope: Scope | Scope[]): void;
  (
    event: string,
    data?: PushData,
    options?: PushOptions,
    context?: PushContext,
    nested?: Walker.Entities,
  ): void;
}

export type ElbLayer = [
  (IArguments | string)?,
  PushData?,
  PushOptions?,
  Walker.OrderedProperties?,
  Walker.Entities?,
];

export type PushData = Elbwalker.PushData | Element | Scope | Scope[];

export type PushOptions = Elbwalker.PushOptions | WebDestination.Config;

export type PushContext = Elbwalker.PushContext | Element;

export type Scope = Document | HTMLElement;

export interface Config extends Elbwalker.Config {
  destinations: Destinations;
  elbLayer: ElbLayer;
}

export interface Destinations {
  [name: string]: WebDestination.Function;
}
