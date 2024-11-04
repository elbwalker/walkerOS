import type { WalkerOS } from '@elbwalker/types';
import type {
  SendDataValue,
  SendHeaders,
  SendWebTransport,
} from '@elbwalker/utils';
import type { WebDestination } from '@elbwalker/walker.js';

export interface Destination
  extends WebDestination.Destination<Custom, CustomEvent> {}

export type Config = WebDestination.Config<Custom, CustomEvent>;

export interface Custom {
  url: string;
  headers?: SendHeaders;
  method?: string;
  transform?: Transform;
  transport?: SendWebTransport;
}

export interface CustomEvent {}

export type Transform = (
  event: WalkerOS.Event,
  config?: Config,
  mapping?: WebDestination.EventMapping<CustomEvent>,
) => SendDataValue;
