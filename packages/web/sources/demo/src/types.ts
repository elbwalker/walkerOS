import type { Source, Elb, WalkerOS } from '@walkeros/core';

declare module '@walkeros/core' {
  interface SourceMap {
    demo: { type: 'demo'; platform?: 'web' };
  }
}

export interface Settings {
  events: Array<WalkerOS.PartialEvent & { delay?: number }>;
}

export interface Mapping {}

export type Push = Elb.Fn;

export interface Env extends Source.BaseEnv {
  elb: Elb.Fn;
}

export type Types = Source.Types<Settings, Mapping, Push, Env>;
