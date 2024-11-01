import type { Destination, WalkerOS } from '.';

export interface Config<CustomEvent> {
  [entity: string]:
    | undefined // @TODO are the undefined types necessary
    | { [action: string]: undefined | Event<CustomEvent> };
}

export interface Event<CustomEvent = unknown> {
  batch?: number; // Bundle events for batch processing
  batchFn?: (
    destination: Destination.Destination,
    instance: WalkerOS.Instance,
  ) => void;
  batched?: Destination.Batch<CustomEvent>; // Batch of events to be processed
  consent?: WalkerOS.Consent; // Required consent states process the event
  custom?: CustomEvent; // Arbitrary but protected configurations for custom event config
  ignore?: boolean; // Choose to no process an event when set to true
  name?: string; // Use a custom event name
}
