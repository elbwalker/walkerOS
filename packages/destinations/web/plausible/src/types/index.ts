import type { WalkerOS } from '@elbwalker/types';
import type { WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    plausible?: Plausible & { q?: IArguments[] };
  }
}

export type Plausible = (
  event: string,
  options?: { props?: WalkerOS.AnyObject },
) => void;

export interface Destination
  extends WebDestination.Destination<Custom, CustomEvent> {}

export type Config = WebDestination.Config<Custom, CustomEvent>;

export interface Custom {
  domain?: string; // Name of the domain to be tracked
}

export interface CustomEvent {}
