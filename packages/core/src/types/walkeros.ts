import type { Elb as ElbTypes, Handler, Hooks, Destination, On } from '.';

export type AnyObject<T = unknown> = Record<string, T>;
export type Elb = globalThis.WalkerOS.Elb;
export type AnyFunction = (...args: unknown[]) => unknown;
export type SingleOrArray<T> = T | Array<T>;

// Global namespace for type augmentation by destinations
declare global {
  namespace WalkerOS {
    interface Elb extends ElbTypes.Fn {}
  }
}

export type Events = Array<Event>;
export type PartialEvent = Partial<Event>;
export type DeepPartialEvent = DeepPartial<Event>;
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

export interface User extends Properties {
  // IDs
  id?: string;
  device?: string;
  session?: string;
  hash?: string;
  // User related
  address?: string;
  email?: string;
  phone?: string;
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: string;
  language?: string;
  country?: string;
  region?: string;
  city?: string;
  zip?: string;
  timezone?: string;
  os?: string;
  osVersion?: string;
  screenSize?: string;
  ip?: string;
  internal?: boolean;
}

export interface Version extends Properties {
  source: string;
  tagging: number;
}

export interface Source extends Properties {
  type: SourceType;
  id: string; // https://github.com/elbwalker/walkerOS
  previous_id: string; // https://www.elbwalker.com/
}

export type SourceType = 'web' | 'server' | 'app' | 'other' | string;

export type PropertyType =
  | boolean
  | string
  | number
  | { [key: string]: Property };

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

export type ConsentHandler = Record<string, AnyFunction>;
export type ActionHandler = AnyFunction;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PromiseOrValue<T> = T | Promise<T>;
