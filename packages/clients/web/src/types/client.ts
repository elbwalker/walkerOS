import type { Elbwalker } from '@elbwalker/types';
import type { WebDestination, Walker } from '.';

declare global {
  interface Window {
    elbwalker: Function;
    elbLayer: ElbLayer;
    dataLayer: WalkerEvent | unknown;
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
    nested?: Elbwalker.Entities,
  ): void;
}

export type ElbLayer = [
  (IArguments | string)?,
  PushData?,
  PushOptions?,
  Elbwalker.OrderedProperties?,
  Elbwalker.Entities?,
];

export type PushData =
  | Elbwalker.PushData
  | WebDestination.Function
  | Element
  | Scope
  | Scope[];

export type PushOptions =
  | Elbwalker.PushOptions
  | Walker.Trigger
  | WebDestination.Config;

export type PushContext = Elbwalker.PushContext | Element;

export type Scope = Document | HTMLElement;
// @TODO ScopeType with Element

export interface Config extends Elbwalker.Config {
  destinations: Destinations;
  elbLayer: ElbLayer;
  pageview: boolean;
  prefix: string;
  queue: Elbwalker.Events;
}

export interface Destinations {
  [name: string]: WebDestination.Function;
}
