import type { Elbwalker } from '.';

export interface Contract {
  version: string;
  globals: Globals;
  context: Contexts;
  entities: Entities;
  // @TODO data as ref
}

export interface Globals {
  [name: string]: Global;
}

export interface Contexts {
  [name: string]: Context;
}

export interface Entities {
  [name: string]: Entity;
}

export interface Properties {
  [name: string]: Property;
}

export interface Global extends Property {}

export interface Context extends Property {}

export interface Entity {
  data: Properties;
  actions: Actions;
}

export interface Actions {
  [name: string]: Action;
}

export interface Action {
  trigger?: Trigger;
}

export type Trigger = string; // @TODO Move to web data contract

export interface Property {
  type?: PropertyType; // @TODO support multiple
  required?: boolean;
  values?: PropertyValues;
}

export type PropertyType = 'boolean' | 'string' | 'number';

export type PropertyValues = Array<Elbwalker.Property>;
