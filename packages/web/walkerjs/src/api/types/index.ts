import type { Mapping } from '@walkerOS/types';
import type { SendDataValue, SendHeaders } from '@walkerOS/utils';
import type { SendWebTransport } from '@walkerOS/web';

import type { DestinationWeb } from '@walkerOS/web';

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
