import { AnyObject } from './globals';
import { Walker } from './walker';

export declare namespace Destination {
  interface Function {
    init: (config: AnyObject) => void;
    push: (event: Event) => void;
    mapping: Mapping | false;
  }
  type Functions = Function[];

  interface Event {
    entity: string;
    action: string;
    data?: AnyObject;
    trigger?: string;
    nested: Walker.Entities;
    group: string;
  }

  interface Mapping {
    [entity: string]: { [action: string]: boolean };
  }
}
