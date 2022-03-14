export type PushEvent = Array<[Attribute, unknown]>;

export type Entities = Entity[];
export interface Entity {
  type: EntityType;
  data: EntityData;
  nested: Entities;
}

export type EntityType = string;
export type EntityData = {
  [name: string]: string;
};

export type KeyVal = [string, string];
export type Attribute = string | undefined;
export type Trigger = 'load' | 'click' | 'visible' | 'submit' | 'wait';
export type Filter = ElbValues | undefined;

export interface ElbValues {
  [name: string]: string;
}
