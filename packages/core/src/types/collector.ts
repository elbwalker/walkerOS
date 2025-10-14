import type {
  Source,
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
  /** Version for event tagging */
  tagging: number;
  /** Static global properties even on a new run */
  globalsStatic: WalkerOS.Properties;
  /** Static session data even on a new run */
  sessionStatic: Partial<SessionData>;
  /** Enable verbose logging */
  verbose: boolean;
  /** Error handler */
  onError?: Handler.Error;
  /** Log handler */
  onLog?: Handler.Log;
}

/**
 * Initialization configuration that extends Config with initial state
 */
export interface InitConfig extends Partial<Config> {
  /** Initial consent state */
  consent?: WalkerOS.Consent;
  /** Initial user data */
  user?: WalkerOS.User;
  /** Initial global properties */
  globals?: WalkerOS.Properties;
  /** Source configurations */
  sources?: Source.InitSources;
  /** Destination configurations */
  destinations?: Destination.InitDestinations;
  /** Initial custom properties */
  custom?: WalkerOS.Properties;
}

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
  [id: string]: Source.Instance;
}

export interface Destinations {
  [id: string]: Destination.Instance;
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
