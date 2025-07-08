import type { Mapping } from '@walkerOS/types';
import type { SendDataValue, SendHeaders } from '@walkerOS/utils';
import type { DestinationWeb } from '@walkerOS/web-collector';
import type { SendWebTransport } from '@walkerOS/web-collector';

export type Destination = DestinationWeb.Destination<Settings, EventMapping>;
export type Config = DestinationWeb.Config<Settings, EventMapping>;

// Destination-specific settings (internal usage)
export interface Settings {
  url: string;
  headers?: SendHeaders;
  method?: string;
  transform?: Transform;
  transport?: SendWebTransport;
}

// Single event transformation rule
export interface EventMapping {}

export type EventConfig = Mapping.EventConfig<EventMapping>;

export type Transform = (
  data?: unknown,
  config?: Config,
  mapping?: DestinationWeb.EventMapping<EventMapping>,
) => SendDataValue;
