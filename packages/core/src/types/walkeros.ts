import type { Elb as ElbTypes } from '.';

export type AnyObject<T = unknown> = Record<string, T>;
export type Elb = ElbTypes.Fn;
export type AnyFunction = (...args: unknown[]) => unknown;
export type SingleOrArray<T> = T | Array<T>;

export type Events = Array<Event>;
export type PartialEvent = Partial<Event>;
export type DeepPartialEvent = DeepPartial<Event>;
export interface Event {
  name: string;
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

export type SourcePlatform =
  | 'web'
  | 'server'
  | 'app'
  | 'ios'
  | 'android'
  | 'terminal'
  | string;

/**
 * SourceMap is the discriminated-union registry for source kinds.
 * Each source package augments this interface via `declare module
 * '@walkeros/core'` to register its own `type` literal and any
 * source-specific fields. Conflicting declarations cause compile errors,
 * intentional, to surface naming collisions early.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SourceMap {
  collector: { type: 'collector' };
}

export interface Source extends Properties {
  type: string;
  platform?: SourcePlatform;
  /** Deployment version of the source emitter (string). */
  version?: string;
  /** Event-model spec version. Collector defaults to "4". */
  schema?: string;
  /** Emission sequence per run (was: event.count). */
  count?: number;
  /** W3C traceparent full string; set when the emission is part of a chained trace. */
  trace?: string;
  /** Walker-controlled standard suggestions (sources may set). */
  url?: string;
  referrer?: string;
  tool?: string;
  command?: string;
}

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
  entity: string;
  data: Properties;
  nested?: Entities;
  context?: OrderedProperties;
}

export type ConsentHandler = Record<string, AnyFunction>;
export type ActionHandler = AnyFunction;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PromiseOrValue<T> = T | Promise<T>;
