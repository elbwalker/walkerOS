export declare namespace Walker {
  type PushEvent = Array<[Attribute, unknown]>;

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
  type Attribute = string | undefined;
  type Trigger = 'load' | 'click' | 'visible' | 'submit' | 'wait';
  type Filter = Values | undefined;

  interface Values {
    [name: string]: string;
  }
}
