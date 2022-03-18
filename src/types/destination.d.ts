import { Elbwalker } from './elbwalker';
import { AnyObject } from './globals';

export declare namespace Destination {
  type Functions = Function[];
  interface Function {
    init: (config: AnyObject) => void;
    push: (event: Elbwalker.Event) => void;
    mapping: Mapping | false;
  }

  interface Mapping {
    [entity: string]: { [action: string]: boolean };
  }
}
