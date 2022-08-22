import { Elbwalker } from './elbwalker';
import { AnyObject } from './globals';

export declare namespace WebDestination {
  type Functions = Function[];
  interface Function {
    init?: () => boolean;
    push: (event: Elbwalker.Event) => void;
    config: Config;
  }

  interface Config {
    custom?: AnyObject; // Arbitrary but protected configurations for custom enhancements
    init?: boolean; // if the destination has been initialized by calling the init method
    mapping?: Mapping; // a map to handle events individually
  }

  interface Mapping {
    [entity: string]: { [action: string]: AnyObject };
  }
}
