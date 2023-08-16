export type Events = Event[];

export interface Event {
  entity: string;
  action: string;
  data?: Properties;
  context?: OrderedProperties;
  trigger?: string;
  nested: Entities;
}

export type PropertyType = boolean | string | number;

export type Property = PropertyType | Array<PropertyType>;
export interface Properties {
  [key: string]: Property;
}
export interface OrderedProperties {
  [key: string]: [Property, number];
}

export type Entities = Array<Entity>;
export interface Entity {
  type: string;
  data: Properties;
  nested: Entities;
  context: OrderedProperties;
}

export type KeyVal = [string, string];

export type Attributes = Array<string>;

export type Trigger =
  | 'click'
  | 'custom'
  | 'hover'
  | 'load'
  | 'pulse'
  | 'scroll'
  | 'submit'
  | 'visible'
  | 'wait'
  | string;

export interface Filter {
  [name: string]: boolean;
}

export interface TriggersActionGroups {
  [trigger: string]: TriggerActions;
}

export type TriggerActions = Array<TriggerAction>;

interface TriggerAction {
  trigger: string;
  triggerParams?: string;
  action: string;
  actionParams?: string;
}

export type ScrollElements = Array<[HTMLElement, number]>;
