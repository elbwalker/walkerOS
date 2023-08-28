import type { Elbwalker } from '@elbwalker/types';

export type Events = Event[];

export interface Event {
  entity: string;
  action: string;
  data?: Elbwalker.Properties;
  context?: Elbwalker.OrderedProperties;
  trigger?: Trigger;
  nested: Elbwalker.Entities;
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
