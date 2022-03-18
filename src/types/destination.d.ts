import { Elbwalker } from './elbwalker';
import { AnyObject } from './globals';

export declare namespace Destination {
  interface Function {
    init: (config: AnyObject) => void;
    push: (event: Elbwalker.Event) => void;
    mapping: Mapping | false;
  }
  type Functions = Function[];

  interface Mapping {
    [entity: string]: { [action: string]: boolean };
  }
}
