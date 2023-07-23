import { Walker } from './walker';

export namespace Contract {
  export interface Data {
    version: string;
    globals: Globals;
    context: Contexts;
    entities: Entities;
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

  interface Entity {}

  interface Property {
    name: string;
    type: Walker.Property;
  }
}
