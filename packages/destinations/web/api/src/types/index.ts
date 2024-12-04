import type { WalkerOS } from '@elbwalker/types';
import type {
  SendDataValue,
  SendHeaders,
  SendWebTransport,
} from '@elbwalker/utils';
import type { DestinationWeb } from '@elbwalker/walker.js';

export interface Destination
  extends DestinationWeb.Destination<Custom, CustomEvent> {}

export type Config = DestinationWeb.Config<Custom, CustomEvent>;

export interface Custom {
  url: string;
  headers?: SendHeaders;
  method?: string;
  transform?: Transform;
  transport?: SendWebTransport;
}

export interface CustomEvent {}

export type Transform = (
  event?: WalkerOS.Event | WalkerOS.Property,
  config?: Config,
  mapping?: DestinationWeb.EventMapping<CustomEvent>,
) => SendDataValue;
