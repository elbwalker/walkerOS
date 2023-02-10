import { IElbwalker } from '.';

export namespace WebDestination {
  interface Function<Custom = unknown, EventCustom = unknown> {
    init?: (config: Config<Custom, EventCustom>) => boolean;
    push: (
      event: IElbwalker.Event,
      config: Config<Custom, EventCustom>,
      mapping?: EventConfig<EventCustom>,
    ) => void;
    config: Config<Custom, EventCustom>;
    queue?: Array<IElbwalker.Event>; // Non processed events yet and resettet with each new run
  }

  interface Config<
    Custom = IElbwalker.AnyObject,
    EventCustom = IElbwalker.AnyObject,
  > {
    consent?: IElbwalker.Consent; // Required consent states to init and push events
    custom?: Custom; // Arbitrary but protected configurations for custom enhancements
    init?: boolean; // If the destination has been initialized by calling the init method
    loadScript?: boolean; // If an additional script to work should be loaded
    mapping?: Mapping<EventCustom>; // A map to handle events individually
    queue?: boolean; // Disable processing of previously pushed events
  }

  interface Mapping<EventCustom> {
    [entity: string]: { [action: string]: EventConfig<EventCustom> };
  }

  interface EventConfig<EventCustom = unknown> {
    consent?: IElbwalker.Consent; // Required consent states to init and push events
    custom?: EventCustom; // Arbitrary but protected configurations for custom event config
    ignore?: boolean; // Choose to no process an event when set to true
    name?: string; // Use a custom event name
  }
}
