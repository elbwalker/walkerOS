import type { Mapping } from '@elbwalker/types';
import type { SendDataValue, SendHeaders } from '@elbwalker/utils';
import type { SendWebTransport } from '@elbwalker/utils/web';

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

export type EventConfig = Mapping.EventConfig<CustomEvent>;

export type Transform = (
  data?: unknown,
  config?: Config,
  mapping?: DestinationWeb.EventMapping<CustomEvent>,
) => SendDataValue;
