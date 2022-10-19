export namespace Walker {
  type Events = Event[];
  interface Event {
    entity: string;
    action: string;
    data?: Properties;
    context?: Properties;
    trigger?: string;
    nested: Walker.Entities;
  }

  type Property = boolean | string | number;
  interface Properties {
    [key: string]: Property | Array<Property>;
  }

  type Entities = Array<Entity>;
  interface Entity {
    type: string;
    data: Properties;
    nested: Entities;
    context: Properties;
  }

  type KeyVal = [string, string];

  type Attributes = Array<string>;

  const enum Trigger {
    Click = 'click',
    Hover = 'hover',
    Load = 'load',
    Pulse = 'pulse',
    Submit = 'submit',
    Visible = 'visible',
    Wait = 'wait',
  }

  interface Filter {
    [name: string]: boolean;
  }

  type Scope = Document | Element;

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
