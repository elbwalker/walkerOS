import { AnyObject } from './globals';

export declare namespace Walker {
  type PushEvent = Array<[string, unknown]>;

  type Events = Event[];
  interface Event {
    entity: string;
    action: string;
    data?: AnyObject;
    trigger?: string;
    nested: Walker.Entities;
  }

  type Entities = Entity[];
  interface Entity {
    type: EntityType;
    data: EntityData;
    nested: Entities;
  }

  type EntityType = string;
  type EntityData = {
    [name: string]: string;
  };

  type KeyVal = [string, string];
  type Trigger = 'click' | 'hover' | 'load' | 'submit' | 'visible' | 'wait';
  type Filter = Values | undefined;
  type Scope = Document | Element;

  interface Values {
    [name: string]: string;
  }
}
