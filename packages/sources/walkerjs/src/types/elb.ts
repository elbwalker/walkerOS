import type { WalkerOS } from '@elbwalker/types';
import { State } from './source';
import type { On, DestinationWeb, Walker } from '.';

export interface Fn
  extends CommandInit,
    CommandDestination,
    CommandRun,
    CommandOn,
    Parameters,
    WalkerOS.DeepPartialEvent {}

export type CommandInit = (
  event: 'walker init',
  scope: Scope | Scope[],
) => void;

export type CommandDestination = (
  event: 'walker destination',
  destination: DestinationWeb.Destination | DestinationWeb.DestinationInit,
  config?: DestinationWeb.Config,
) => void;

export type CommandRun = (event: 'walker run', state?: Partial<State>) => void;

export type CommandOn = (
  event: 'walker on',
  type: 'consent',
  rules: WalkerOS.SingleOrArray<On.ConsentConfig>,
) => void;

export type Parameters = (
  event: string | unknown,
  data?: PushData,
  options?: PushOptions,
  context?: PushContext,
  nested?: WalkerOS.Entities,
  custom?: WalkerOS.Properties,
) => void;

export type Layer = [
  string?,
  PushData?,
  PushOptions?,
  WalkerOS.OrderedProperties?,
  WalkerOS.Entities?,
  WalkerOS.Properties?,
];

export type PushData =
  | WalkerOS.PushData
  | DestinationWeb.Destination
  | DestinationWeb.DestinationInit
  | Partial<State>
  | ScopeType;

export type PushOptions =
  | WalkerOS.PushOptions
  | Walker.Trigger
  | WalkerOS.SingleOrArray<On.Options>
  | DestinationWeb.Config;

export type PushContext = WalkerOS.OrderedProperties;
export type Scope = Element | Document;
export type ScopeType = Scope | Scope[];
