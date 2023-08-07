import { Walker } from './walker';

export namespace Data {
  export interface Contract {
    version: string;
    globals: Globals;
    context: Contexts;
    entities: Entities;
    // @TODO data as ref
  }

  interface Globals {
    [name: string]: Global;
  }

  interface Contexts {
    [name: string]: Context;
  }

  interface Entities {
    [name: string]: Entity;
  }

  interface Properties {
    [name: string]: Property;
  }

  interface Global extends Property {}

  interface Context extends Property {}

  interface Entity {
    data: Properties;
    actions: Actions;
  }

  interface Actions {
    [name: string]: Action;
  }

  interface Action {
    trigger?: Trigger;
  }

  type Trigger = string; // @TODO change to Walker.Trigger once updated

  interface Property {
    type?: PropertyType; // @TODO support multiple
    required?: boolean;
    values?: PropertyValues;
  }

  type PropertyType = 'boolean' | 'string' | 'number';

  type PropertyValues = Array<Walker.Property>;

  interface PropertyValue {}
}
