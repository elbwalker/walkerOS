/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Logger, WalkerOS, Context as BaseContext } from '.';
import type { DestroyFn, SetupFn } from './lifecycle';

export interface BaseEnv {
  [key: string]: unknown;
}

export interface Types<
  S = unknown,
  E = BaseEnv,
  I = S,
  U = unknown,
  C = unknown,
> {
  settings: S;
  initSettings: I;
  env: E;
  setup: U;
  credentials: C;
}

export type TypesGeneric = {
  settings: any;
  initSettings: any;
  env: any;
  setup: any;
  credentials: any;
};

export type Settings<T extends TypesGeneric = Types> = T['settings'];
export type InitSettings<T extends TypesGeneric = Types> = T['initSettings'];
export type Env<T extends TypesGeneric = Types> = T['env'];
export type SetupOptions<T extends TypesGeneric = Types> = T['setup'];
export type Credentials<T extends TypesGeneric = Types> = T['credentials'];

export type TypesOf<I> = I extends Instance<infer T> ? T : never;

export interface Config<T extends TypesGeneric = Types> {
  settings?: InitSettings<T>;
  /**
   * Optional, strictly-typed credentials slot ($env-resolved). The package
   * defines the shape via `Types['credentials']`. `settings.<sdk>` stays the
   * escape hatch for raw SDK options.
   */
  credentials?: Credentials<T>;
  env?: Env<T>;
  id?: string;
  logger?: Logger.Config;
  /**
   * Provisioning options for `walkeros setup`. `boolean | object`.
   * Triggered only by explicit CLI invocation; never automatic.
   */
  setup?: boolean | SetupOptions<T>;
  /**
   * Persist values as raw bytes, byte-exact, bypassing the structured codec.
   * Default false: values are structured `StoreValue` and pass through the
   * shared core serialization codec. Set true only on byte-native backends
   * (fs/s3/gcs) whose consumer needs the exact bytes back, e.g. serving an
   * asset such as walker.js. Structured-only backends (sheets) reject `file:
   * true` at init. One store instance is exactly one mode.
   */
  file?: boolean;
}

export type PartialConfig<T extends TypesGeneric = Types> = Config<
  Types<
    Partial<Settings<T>> | Settings<T>,
    Env<T>,
    InitSettings<T>,
    SetupOptions<T>,
    Credentials<T>
  >
>;

export interface Context<
  T extends TypesGeneric = Types,
> extends BaseContext.Base<Config<T>, Env<T>> {
  id: string;
}

/**
 * Canonical structured value persisted by a store. Includes `null`, but
 * EXCLUDES `undefined`: `undefined` is the reserved "miss" sentinel returned
 * by `GetFn` for an absent key, so it must never be a stored value.
 * `Uint8Array` is the platform-neutral binary leaf (never Node `Buffer`).
 */
export type StoreValue =
  | string
  | number
  | boolean
  | null
  | Uint8Array
  | StoreValue[]
  | { [key: string]: StoreValue };

export type GetFn<T extends StoreValue = StoreValue> = (
  key: string,
) => T | undefined | Promise<T | undefined>;

export type SetFn<T extends StoreValue = StoreValue> = (
  key: string,
  value: T,
  /**
   * Optional expiry hint in ms; honored only by TTL-native backends
   * (in-memory, Redis). Byte/JSON backends may ignore it. Authoritative cache
   * expiry lives in the cache wrapper's {value, exp} payload.
   */
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

/**
 * Typed accessor for stores registered on a collector.
 *
 * The collector's `stores` bag indexes to `Store.Instance` (defaults erase
 * the generic). Use this helper at the call site to recover the narrow type
 * without casts.
 *
 * @example
 * type MyStoreTypes = Store.Types<MySettings>;
 * const store = getStore<MyStoreTypes>(collector, 'cache');
 * await store.set('key', 'value');
 *
 * @throws Error with message `Store not found: <id>` when the id is unknown.
 */
export function getStore<T extends TypesGeneric = Types>(
  collector: { stores: { [id: string]: Instance<any> } },
  id: string,
): Instance<T> {
  const store = collector.stores[id];
  if (!store) {
    throw new Error(`Store not found: ${id}`);
  }
  return store as unknown as Instance<T>;
}

/**
 * Read-site narrowing helper for store values.
 *
 * `Instance.get`/`set` stay value-agnostic at `StoreValue`, so callers
 * that know the concrete shape narrow here instead of threading a value type
 * through `Store.Types`. The single narrow `as` cast is justified: the store
 * channel is structurally `StoreValue`, and the caller asserts the concrete
 * sub-shape it stored. `undefined` is preserved as the miss sentinel.
 */
export async function getStoreValue<V extends StoreValue = StoreValue>(
  store: Instance,
  key: string,
): Promise<V | undefined> {
  return (await store.get(key)) as V | undefined;
}
