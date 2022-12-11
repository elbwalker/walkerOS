import { IElbwalker } from '.';

export namespace WebDestination {
  type Functions = Function[];
  interface Function {
    init?: () => boolean;
    push: (
      event: IElbwalker.Event,
      mapping?: EventConfig,
      config?: Config,
    ) => void;
    config: Config;
    queue?: Array<IElbwalker.Event>; // Non processed events yet and resettet with each new run
  }

  interface Config {
    consent?: IElbwalker.Consent; // Required consent states to init and push events
    custom?: IElbwalker.AnyObject; // Arbitrary but protected configurations for custom enhancements
    init?: boolean; // If the destination has been initialized by calling the init method
    loadScript?: boolean; // If an additional script to work should be loaded
    mapping?: Mapping<EventConfig>; // A map to handle events individually
  }

  interface Mapping<EventConfig> {
    [entity: string]: { [action: string]: EventConfig };
  }

  interface EventConfig {
    // Recommended common event config
    consent?: IElbwalker.Consent; // Required consent states to init and push events
    ignore?: boolean; // Choose to no process an event when set to true
    name?: string; // Use a custom event name
  }
}
