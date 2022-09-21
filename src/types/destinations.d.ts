import { IElbwalker } from '.';

export namespace WebDestination {
  type Functions = Function[];
  interface Function {
    init?: () => boolean;
    push: (event: IElbwalker.Event) => void;
    config: Config;
    queue?: Array<IElbwalker.Event>; // Non processed events yet and resettet with each new run
  }

  interface Config {
    consent?: Consent; // Required consent states to init and push events
    custom?: IElbwalker.AnyObject; // Arbitrary but protected configurations for custom enhancements
    init?: boolean; // if the destination has been initialized by calling the init method
    mapping?: Mapping; // a map to handle events individually
  }

  interface Mapping {
    [entity: string]: { [action: string]: MappingEvent };
  }

  interface MappingEvent {
    consent?: Consent; // Required consent states to init and push events
    custom?: IElbwalker.AnyObject; // Arbitrary but protected configurations for custom enhancements
  }

  interface Consent {
    [name: string]: boolean; // name of consent group or tool
  }
}
