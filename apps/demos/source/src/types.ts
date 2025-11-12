import type { Source, Elb, WalkerOS } from '@walkeros/core';

export interface Settings {
  events: Array<WalkerOS.PartialEvent & { delay?: number }>;
}

export interface Mapping {}

export type Push = Elb.Fn;

export interface Env extends Source.BaseEnv {
  elb: Elb.Fn;
}

export type Types = Source.Types<Settings, Mapping, Push, Env>;
