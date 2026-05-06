/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Logger, WalkerOS, Context as BaseContext } from '.';
import type { DestroyFn, SetupFn } from './lifecycle';

export interface BaseEnv {
  [key: string]: unknown;
}

export interface Types<S = unknown, E = BaseEnv, I = S, U = unknown> {
  settings: S;
  initSettings: I;
  env: E;
  setup: U;
}

export type TypesGeneric = {
  settings: any;
  initSettings: any;
  env: any;
  setup: any;
};

export type Settings<T extends TypesGeneric = Types> = T['settings'];
export type InitSettings<T extends TypesGeneric = Types> = T['initSettings'];
export type Env<T extends TypesGeneric = Types> = T['env'];
export type SetupOptions<T extends TypesGeneric = Types> = T['setup'];

export type TypesOf<I> = I extends Instance<infer T> ? T : never;

export interface Config<T extends TypesGeneric = Types> {
  settings?: InitSettings<T>;
  env?: Env<T>;
  id?: string;
  logger?: Logger.Config;
  /**
   * Provisioning options for `walker setup`. `boolean | object`.
   * Triggered only by explicit CLI invocation; never automatic.
   */
  setup?: boolean | SetupOptions<T>;
}

export type PartialConfig<T extends TypesGeneric = Types> = Config<
  Types<
    Partial<Settings<T>> | Settings<T>,
    Env<T>,
    InitSettings<T>,
    SetupOptions<T>
  >
>;

export interface Context<
  T extends TypesGeneric = Types,
> extends BaseContext.Base<Config<T>, Env<T>> {
  id: string;
}

export type GetFn<T = unknown> = (
  key: string,
) => T | undefined | Promise<T | undefined>;

export type SetFn<T = unknown> = (
  key: string,
  value: T,
  ttl?: number,
) => void | Promise<void>;

export type DeleteFn = (key: string) => void | Promise<void>;

export interface Instance<T extends TypesGeneric = Types> {
  type: string;
  config: Config<T>;
  get: GetFn;
  set: SetFn;
  delete: DeleteFn;
  setup?: SetupFn<Config<T>, Env<T>>;
  destroy?: DestroyFn<Config<T>, Env<T>>;
}

export type Init<T extends TypesGeneric = Types> = (
  context: Context<Types<Partial<Settings<T>>, Env<T>, InitSettings<T>>>,
) => Instance<T> | Promise<Instance<T>>;

export type InitFn<T extends TypesGeneric = Types> = (
  context: Context<T>,
) => WalkerOS.PromiseOrValue<void | false | Config<T>>;

export type InitStore<T extends TypesGeneric = Types> = {
  code: Init<T>;
  config?: Partial<Config<T>>;
  env?: Partial<Env<T>>;
};

export interface InitStores {
  [storeId: string]: InitStore<any>;
}

export interface Stores {
  [storeId: string]: Instance;
}
