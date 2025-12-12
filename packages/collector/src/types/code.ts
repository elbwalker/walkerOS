import type { Destination, Mapping, On, WalkerOS } from '@walkeros/core';

export interface Settings {
  scripts?: string[];
  init?: string;
  on?: string;
  push?: string;
  pushBatch?: string;
}

export interface CodeMapping extends Mapping.Rule<CodeMapping> {
  push?: string;
  pushBatch?: string;
}

export type Types = Destination.Types<Settings, CodeMapping>;
export type Config = Destination.Config<Types>;
export type Context = Destination.Context<Types>;
export type InitContext = Destination.InitContext<Types>;
export type PushContext = Destination.PushContext<Types>;
export type PushBatchContext = Destination.PushBatchContext<Types>;

export type InitFn = (context: InitContext) => void;
export type OnFn = (type: On.Types, context: Context) => void;
export type PushFn = (event: WalkerOS.Event, context: PushContext) => void;
export type PushBatchFn = (
  batch: Destination.Batch<CodeMapping>,
  context: PushBatchContext,
) => void;
