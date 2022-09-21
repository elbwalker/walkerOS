import { IElbwalker } from '.';

export namespace Walker {
  type PushEvent = Array<[string, unknown]>;

  type Events = Event[];
  interface Event {
    entity: string;
    action: string;
    data?: IElbwalker.AnyObject;
    trigger?: string;
    nested: Walker.Entities;
  }

  type Entities = Array<Entity>;
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

  type Attributes = Array<string>;
  // @TODO make trigger to const enums
  type Trigger =
    | 'click'
    | 'hover'
    | 'load'
    | 'pulse'
    | 'submit'
    | 'visible'
    | 'wait';

  interface Filter {
    [name: string]: boolean;
  }

  type Scope = Document | Element;

  interface Values {
    [name: string]: string;
  }

  interface TriggersActions {
    [trigger: string]: TriggerActions;
  }

  type TriggerActions = Array<TriggerAction>;

  interface TriggerAction {
    trigger: string;
    triggerParams?: string;
    action: string;
    actionParams?: string;
  }
}
