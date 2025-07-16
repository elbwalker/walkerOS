import type { Destination, Elb as ElbTypes, Handler, Hooks } from '.';

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

export interface Collector extends State {
  push: ElbTypes.Fn;
  sources?: Record<string, CollectorSource>;
  addSource(source: CollectorSource): Promise<void>;
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
  on: OnConfig;
  queue: Events;
  round: number;
  session: undefined | SessionData;
  timing: number;
  user: User;
  version: string;
  sources?: Record<string, CollectorSource>;
}

export interface Config {
  dryRun: boolean;
  tagging: number;
  session: false | unknown;
  default: boolean;
  verbose: boolean;
  globalsStatic: Properties;
  sessionStatic: Partial<SessionData>;
  onError?: Handler.Error;
  onLog?: Handler.Log;
  run?: boolean;
}

export interface Destinations {
  [id: string]: Destination.Destination;
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

export interface SessionData extends Properties {
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
  source: string;
  tagging: number;
}

export interface Source extends Properties {
  type: SourceType;
  id: string; // https://github.com/elbwalker/walkerOS
  previous_id: string; // https://www.elbwalker.com/
}

export type SourceType = 'web' | 'server' | 'app' | 'other' | string;

// Collector Source interface for the unified collector
export interface CollectorSource {
  type: string;
  init?(
    collector: Collector,
    config: CollectorSourceConfig,
  ): void | Promise<void>;
  mapping?: unknown; // Will be properly typed with Mapping.Config from collector package
  settings?: Record<string, unknown>;
}

export interface CollectorSourceConfig {
  mapping?: unknown; // Will be properly typed with Mapping.Config from collector package
  settings: Record<string, unknown>;
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
  type: string;
  data: Properties;
  nested: Entities;
  context: OrderedProperties;
}

export type ConsentHandler = Record<string, AnyFunction>;
export type ActionHandler = AnyFunction;

// @TODO standardize on config in server and web collectors
export interface OnConfig {
  consent?: ConsentHandler[];
  ready?: ActionHandler[];
  run?: ActionHandler[];
  session?: ActionHandler[];
  [key: string]: ConsentHandler[] | ActionHandler[] | undefined;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PromiseOrValue<T> = T | Promise<T>;
