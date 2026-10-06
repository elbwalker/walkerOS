/**
 * Package-internal type helpers. Not re-exported from `types/index.ts`.
 */

/**
 * `true` when A and B are the same type, `false` otherwise.
 *
 * The double-function indirection compares the two types strictly; a plain
 * mutual `extends` check is fooled by `any` and by distributive types.
 */
export type IsExactly<A, B> =
  (<V>() => V extends A ? 1 : 2) extends <V>() => V extends B ? 1 : 2
    ? true
    : false;

type AnyFunction = (...args: never[]) => unknown;

/**
 * `true` when an object type has a function-valued property. Such objects
 * (class instances, DOM nodes, SDK clients) are values, not plain data, so
 * widening leaves them as they are instead of recursing into them.
 */
type HasMethod<T> = true extends {
  [K in keyof T]-?: NonNullable<T[K]> extends AnyFunction ? true : false;
}[keyof T]
  ? true
  : false;

/**
 * A literal leaf also accepts its primitive. `(string & {})` keeps the
 * literal members visible (completions, error messages) instead of collapsing
 * the union to `string`; a leaf typed as plain `string` stays `string`.
 */
type WidenValue<T> = T extends string
  ? string extends T
    ? T
    : T | (string & {})
  : T extends number
    ? number extends T
      ? T
      : T | (number & {})
    : T extends boolean
      ? boolean
      : T extends AnyFunction
        ? T
        : T extends readonly (infer U)[]
          ? readonly WidenValue<U>[]
          : T extends object
            ? HasMethod<T> extends true
              ? T
              : WidenLiterals<T>
            : T;

/**
 * An object type whose string, number and boolean literals also accept their
 * primitive (`transport: 'beacon'` widens to `transport: string`), through
 * plain objects and arrays: what a config value declared in a separate
 * variable looks like. Keys, required fields and value kinds stay checked,
 * and literal completions still come from `T`. Functions and objects with
 * methods stay as they are.
 */
export type WidenLiterals<T> = { [K in keyof T]: WidenValue<T[K]> };

/**
 * `WidenLiterals` for a config slot of any shape. The top level is always
 * mapped, so a settings object with a callback still has its literal
 * properties widened; a slot that is not an object (`unknown`, `any`, a
 * primitive) keeps its own looseness.
 */
export type WidenConfig<T> = T extends AnyFunction
  ? T
  : T extends readonly unknown[]
    ? WidenValue<T>
    : T extends object
      ? WidenLiterals<T>
      : WidenValue<T>;

/*
 * Typed step authoring for `startFlow`. Each kind (source, destination,
 * transformer, store) binds these helpers to its own Init type in
 * `Init<Kind>Entry<T>` and `Init<Kind>sOf<M>`; the rules live here only.
 */

/**
 * Types of one step entry, inferred from its `code`. `Generic` is the kind's
 * `TypesGeneric`, `Default` its bare `Types`. Falls back to `Generic` (the
 * looseness of the erased `Init*` maps) for this entry alone when nothing is
 * inferable (no typed `code`, a code-less hop, an untyped mock) or when
 * `code` uses the bare default Types. Its siblings stay checked.
 */
export type EntryTypes<X, Generic, Default> = X extends Generic
  ? IsExactly<X, Default> extends true
    ? Generic
    : X
  : Generic;

/** The Types slots a step config reads: settings, mapping, setup, credentials. */
type ConfigSlot = 'initSettings' | 'mapping' | 'setup' | 'credentials';

/**
 * A kind's Types as its `config` accepts them: every config slot the kind
 * has also takes its widened form (`WidenConfig`), so a config declared in a
 * separate variable compiles as it did before typing. Slots a kind lacks are
 * simply absent, so one definition serves all kinds.
 */
export type ConfigTypes<T> = {
  [P in keyof T]: P extends ConfigSlot ? WidenConfig<T[P]> : T[P];
};

/**
 * One typed step entry, from the kind's Init type for the entry's Types
 * (`Typed`), for its `ConfigTypes` (`Configured`) and for its `TypesGeneric`
 * (`Generic`): `code` and the routing keys come from `Typed`, `config` from
 * `Configured`, and `env` offers `Typed`'s keys while still accepting every
 * deep-partial mock that `Generic` accepts.
 */
export type TypedStepEntry<
  Typed extends { env?: unknown },
  Configured extends { config?: unknown },
  Generic extends { env?: unknown },
> = Omit<Typed, 'config' | 'env'> & {
  config?: Configured['config'];
  env?: Typed['env'] | Generic['env'];
};
