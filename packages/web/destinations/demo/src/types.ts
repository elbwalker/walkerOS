import type { Destination as CoreDestination } from '@walkeros/core';

export interface Settings {
  name?: string;
  values?: string[];
}

export interface Mapping {}

export interface Env extends CoreDestination.BaseEnv {
  log?: (msg: string) => void;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env>;

export type Destination = CoreDestination.Instance<Types>;
export type Config = CoreDestination.Config<Types>;
export type InitFn = CoreDestination.InitFn<Types>;
export type PushFn = CoreDestination.PushFn<Types>;
