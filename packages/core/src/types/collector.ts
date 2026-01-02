import type {
  Source,
  Destination,
  Elb as ElbTypes,
  Hooks,
  Logger,
  On,
  Processor,
  WalkerOS,
  Mapping,
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
  /** Logger configuration */
  logger?: Logger.Config;
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
  /** Processor configurations */
  processors?: Processor.InitProcessors;
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

export interface Processors {
  [id: string]: Processor.Instance;
}

/**
 * Resolved processor chains for a flow.
 */
export interface ProcessorChain {
  /** Ordered processor IDs to run before collector (from source.next) */
  pre: string[];
  /** Per-destination processor chains (from destination.before) */
  post: Record<string, string[]>;
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

/**
 * Context passed to collector.push for source mapping
 */
export interface PushContext {
  mapping?: Mapping.Config;
  preChain?: string[];
}

/**
 * Push function signature - handles events only
 */
export interface PushFn {
  (
    event: WalkerOS.DeepPartialEvent,
    context?: PushContext,
  ): Promise<ElbTypes.PushResult>;
}

/**
 * Command function signature - handles walker commands only
 */
export interface CommandFn {
  (command: 'config', config: Partial<Config>): Promise<ElbTypes.PushResult>;
  (command: 'consent', consent: WalkerOS.Consent): Promise<ElbTypes.PushResult>;
  <T extends Destination.Types>(
    command: 'destination',
    destination: Destination.Init<T> | Destination.Instance<T>,
    config?: Destination.Config<T>,
  ): Promise<ElbTypes.PushResult>;
  <K extends keyof Hooks.Functions>(
    command: 'hook',
    name: K,
    hookFn: Hooks.Functions[K],
  ): Promise<ElbTypes.PushResult>;
  (
    command: 'on',
    type: On.Types,
    rules: WalkerOS.SingleOrArray<On.Options>,
  ): Promise<ElbTypes.PushResult>;
  (command: 'user', user: WalkerOS.User): Promise<ElbTypes.PushResult>;
  (
    command: 'run',
    runState?: {
      consent?: WalkerOS.Consent;
      user?: WalkerOS.User;
      globals?: WalkerOS.Properties;
      custom?: WalkerOS.Properties;
    },
  ): Promise<ElbTypes.PushResult>;
  (
    command: string,
    data?: unknown,
    options?: unknown,
  ): Promise<ElbTypes.PushResult>;
}

// Main Collector interface
export interface Instance {
  push: PushFn;
  command: CommandFn;
  allowed: boolean;
  config: Config;
  consent: WalkerOS.Consent;
  count: number;
  custom: WalkerOS.Properties;
  sources: Sources;
  destinations: Destinations;
  processors: Processors;
  processorChain: ProcessorChain;
  globals: WalkerOS.Properties;
  group: string;
  hooks: Hooks.Functions;
  logger: Logger.Instance;
  on: On.OnConfig;
  queue: WalkerOS.Events;
  round: number;
  session: undefined | SessionData;
  timing: number;
  user: WalkerOS.User;
  version: string;
}
