import type { Processor as CoreProcessor } from '@walkeros/core';

export interface Settings {
  name?: string;
  /** Fields to log from the event (dot notation paths). If omitted, logs entire event. */
  fields?: string[];
  /** If true, modifies the event by adding a 'processed' flag. */
  addProcessedFlag?: boolean;
}

export interface Env extends CoreProcessor.BaseEnv {
  log?: (msg: string) => void;
}

export type Types = CoreProcessor.Types<Settings, Env>;

export type Processor = CoreProcessor.Instance<Types>;
export type Config = CoreProcessor.Config<Types>;
export type InitFn = CoreProcessor.InitFn<Types>;
export type Fn = CoreProcessor.Fn<Types>;
