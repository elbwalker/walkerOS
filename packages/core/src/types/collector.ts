import type {
  Destination,
  Elb as ElbTypes,
  Handler,
  Hooks,
  On,
  WalkerOS,
} from '.';

/**
 * Core collector configuration interface
 */
export interface Config {
  /** Whether to run collector automatically */
  run?: boolean;
  /** Initial consent state */
  consent?: WalkerOS.Consent;
  /** Initial user data */
  user?: WalkerOS.User;
  /** Version for event tagging */
  tagging: number;
  /** Initial global properties */
  globals?: WalkerOS.Properties;
  /** Static global properties even on a new run */
  globalsStatic: WalkerOS.Properties;
  /** Static session data even on a new run */
  sessionStatic: Partial<SessionData>;
  /** Destination configurations */
  destinations?: Destination.InitDestinations;
  /** Initial custom properties */
  custom?: WalkerOS.Properties;
  /** Enable verbose logging */
  verbose: boolean;
  /** Error handler */
  onError?: Handler.Error;
  /** Log handler */
  onLog?: Handler.Log;
}

export type InitConfig = Partial<Config>;

export interface SessionData extends WalkerOS.Properties {
  isStart: boolean;
  storage: boolean;
  id?: string;
  start?: number;
  marketing?: true;
  updated?: number;
  isNew?: boolean;
  device?: string;
  count?: number;
  runs?: number;
}

export interface Sources {
  [id: string]: CollectorSource;
}

export interface Destinations {
  [id: string]: Destination.Instance;
}

export interface CollectorSource {
  type: string;
  mapping?: unknown;
  settings?: Record<string, unknown>;
  elb?: WalkerOS.AnyFunction; // Add elb property
}

export type CommandType =
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

// Main Collector interface
export interface Instance {
  push: ElbTypes.Fn;
  allowed: boolean;
  config: Config;
  consent: WalkerOS.Consent;
  count: number;
  custom: WalkerOS.Properties;
  sources: Sources;
  destinations: Destinations;
  globals: WalkerOS.Properties;
  group: string;
  hooks: Hooks.Functions;
  on: On.OnConfig;
  queue: WalkerOS.Events;
  round: number;
  session: undefined | SessionData;
  timing: number;
  user: WalkerOS.User;
  version: string;
}
