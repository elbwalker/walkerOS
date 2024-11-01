import type { Destination, Hooks } from '.';

export type AnyObject = Record<string, unknown>;
export type SingleOrArray<T> = T | Array<T>;

export interface Instance extends State {
  push: Elb;
}

export interface State {
  allowed: boolean;
  config: Config;
  consent: Consent;
  count: number;
  custom: Properties;
  destinations: Destinations;
  globals: Properties;
  group: string;
  hooks: Hooks.Functions;
  queue: Events;
  round: number;
  session: undefined | SessionData;
  user: User;
}

export interface Config {
  tagging: number;
  default?: boolean;
  verbose?: boolean; // Enable verbose logging
}

export interface Elb<R = void> {
  (event: 'walker config', config: Partial<Config>): R;
  (event: 'walker consent', consent: Consent): R;

  <K extends keyof Hooks.Functions>(
    event: 'walker hook',
    name: K,
    hookFn: Hooks.Functions[K],
  ): R;
  (event: 'walker run'): R;
  (event: 'walker user', user: User): R;
  (
    event: string,
    data?: PushData,
    options?: PushOptions,
    context?: PushContext,
    nested?: Entities,
    custom?: Properties,
  ): R;
  (partialEvent: PartialEvent): R;
}

export type PushData =
  | string
  | object
  | Partial<Config>
  | Consent
  | User
  | Properties;

export type PushOptions = Hooks.AnyFunction | object;

export type PushContext = OrderedProperties;

export interface Destinations {
  [name: string]: Destination.Destination;
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

export interface SessionData {
  isStart: boolean; // If this is a new session or a known one
  storage: boolean; // If the storage was used to determine the session
  id?: string; // Session ID
  start?: number; // Timestamp of session start
  marketing?: true; // If the session was started by a marketing parameters
  // Storage data
  updated?: number; // Timestamp of last update
  isNew?: boolean; // If this is the first visit on a device
  device?: string; // Device ID
  count?: number; // Total number of sessions
  runs?: number; // Total number of runs (like page views)
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
  client: string;
  tagging: number;
}

export interface Source extends Properties {
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

export type MappingValue =
  | string
  | MappingValueObject
  | Array<string | MappingValueObject>;
export interface MappingValueObject {
  condition?: MappingCondition;
  consent?: Consent;
  fn?: MappingFn;
  key?: string;
  validate?: MappingValidate;
  value?: PropertyType;
}

export type MappingFn = (
  event: Event,
  mapping: MappingValue,
  instance?: Instance,
) => Property | void;

export type MappingCondition = (
  event: Event,
  mapping: MappingValue,
  instance?: Instance,
) => boolean;

export type MappingValidate = (value?: unknown) => boolean;
