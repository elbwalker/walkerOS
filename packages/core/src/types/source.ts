import type { Collector, WalkerOS } from './index';

export interface Config {
  type: string;
  id?: string;
  disabled?: boolean;
  settings: WalkerOS.AnyObject;
  onError?: WalkerOS.AnyFunction;
}

export type InitConfig = Partial<Config>;

export interface Init<T extends Config = Config, E = WalkerOS.AnyFunction> {
  (
    collector: Collector.Instance,
    config: T,
  ): CreateSource<T, E> | Promise<CreateSource<T, E>>;
}

export interface CreateSource<
  T extends Config = Config,
  E = WalkerOS.AnyFunction,
> {
  source?: Instance<T>;
  elb?: E; // Source-specific elb function with proper type
}

export interface Instance<T extends Config = Config> {
  // id: string;
  type: string;
  config: T;
  collector: Collector.Instance;
  destroy?(): void | Promise<void>;
}
