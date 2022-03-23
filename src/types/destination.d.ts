import { Elbwalker } from './elbwalker';

export declare namespace Destination {
  type Functions = Function[];
  interface Function {
    init?: () => boolean;
    push: (event: Elbwalker.Event) => void;
    config: Config;
  }

  interface Config {
    init?: boolean; // if the destination has been initialized by calling the init method
    mapping?: Mapping; // a map to handle events individually
  }

  interface Mapping {
    [entity: string]: { [action: string]: boolean };
  }
}
