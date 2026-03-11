import type { Transformer as CoreTransformer } from '@walkeros/core';

export interface Settings {
  name?: string;
  /** Fields to log from the event (dot notation paths). If omitted, logs entire event. */
  fields?: string[];
  /** If true, modifies the event by adding a 'processed' flag. */
  addProcessedFlag?: boolean;
}

export interface Env extends CoreTransformer.BaseEnv {
  log?: (msg: string) => void;
}

export type Types = CoreTransformer.Types<Settings, Env>;

export type Transformer = CoreTransformer.Instance<Types>;
export type Config = CoreTransformer.Config<Types>;
export type InitFn = CoreTransformer.InitFn<Types>;
export type Fn = CoreTransformer.Fn<Types>;
