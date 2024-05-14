import type { Hooks, On } from '.';

export type AnyObject = Record<string, unknown>;
export type SingleOrArray<T> = T | Array<T>;

export interface Instance {
  push: Elb;
  config: Config;
  globals: Properties;
}

export interface Elb {
  (event: 'walker config', config: Partial<Config>): void;
  (event: 'walker consent', consent: Consent): void;

  <K extends keyof Hooks.Functions>(
    event: 'walker hook',
    name: K,
    hookFn: Hooks.Functions[K],
  ): void;
  (
    event: 'walker on',
    type: 'consent',
    rules: SingleOrArray<On.ConsentConfig>,
  ): void;
  (event: 'walker run'): void;
  (event: 'walker user', user: User): void;
  (
    event: string,
    data?: PushData,
    options?: PushOptions,
    context?: PushContext,
    nested?: Entities,
    custom?: Properties,
  ): void;
}

export type PushData = string | Partial<Config> | Consent | User | Properties;

export type PushOptions = Hooks.Function;

export type PushContext = OrderedProperties;

export interface Config {
  allowed: boolean;
  consent: Consent;
  count: number;
  custom: Properties;
  group: string;
  hooks: Hooks.Functions;
  on: On.Config;
  round: number;
  timing: number;
  user: User;
  tagging: number;
  default?: boolean;
  verbose?: boolean; // Enable verbose logging
}

export type Events = Array<Event>;
export type PartialEvent = Partial<Event>;
export interface Event {
  event: string;
  data: Properties;
  context: OrderedProperties;
  globals: Properties;
  custom: Properties;
  user: User;
  nested: Entities;
  consent: Consent;
  id: string;
  trigger: string;
  entity: string;
  action: string;
  timestamp: number;
  timing: number;
  group: string;
  count: number;
  version: Version;
  source: Source;
}

export interface Consent {
  [name: string]: boolean; // name of consent group or tool
}

export type Commands =
  | 'action'
  | 'config'
  | 'consent'
  | 'context'
  | 'destination'
  | 'elb'
  | 'globals'
  | 'hook'
  | 'init'
  | 'link'
  | 'run'
  | 'user'
  | 'walker'
  | string;

export interface User {
  id?: string;
  device?: string;
  session?: string;
}

export interface Version {
  client: string;
  tagging: number;
}

export interface Source {
  type: SourceType;
  id: string; // https://github.com/elbwalker/walkerOS
  previous_id: string; // https://www.elbwalker.com/
}

export type SourceType = 'web' | 'node' | 'app' | 'other' | string;

export type PropertyType = boolean | string | number;

export type Property = PropertyType | Array<PropertyType>;
export interface Properties {
  [key: string]: Property | undefined;
}
export interface OrderedProperties {
  [key: string]: [Property, number] | undefined;
}

export type Entities = Array<Entity>;
export interface Entity {
  type: string;
  data: Properties;
  nested: Entities;
  context: OrderedProperties;
}
