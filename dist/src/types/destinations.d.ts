import { Elbwalker } from ".";

export namespace WebDestination {
  type Functions = Function[];
  interface Function {
    init?: () => boolean;
    push: (event: Elbwalker.Event) => void;
    config: Config;
  }

  interface Config {
    custom?: Elbwalker.AnyObject; // Arbitrary but protected configurations for custom enhancements
    init?: boolean; // if the destination has been initialized by calling the init method
    mapping?: Mapping; // a map to handle events individually
  }

  interface Mapping {
    [entity: string]: { [action: string]: Elbwalker.AnyObject };
  }
}
