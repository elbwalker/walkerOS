import type { Destination, WalkerOS } from '.';

export interface Config<CustomEvent> {
  [entity: string]:
    | { [action: string]: Event<CustomEvent> | undefined }
    | undefined;
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

export type MappingValue =
  | string
  | MappingValueObject
  | Array<string | MappingValueObject>;

export interface MappingValueObject {
  condition?: MappingCondition;
  consent?: WalkerOS.Consent;
  fn?: MappingFn;
  key?: string;
  validate?: MappingValidate;
  value?: WalkerOS.PropertyType;
}

export type MappingFn = (
  event: Event,
  mapping: MappingValue,
  instance?: WalkerOS.Instance,
) => WalkerOS.Property | void;

export type MappingCondition = (
  event: Event,
  mapping: MappingValue,
  instance?: WalkerOS.Instance,
) => boolean;

export type MappingValidate = (value?: unknown) => boolean;
