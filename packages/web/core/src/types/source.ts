/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Collector, WalkerOS, Source as CoreSource } from '@walkeros/core';

export type TypesGeneric = CoreSource.TypesGeneric;

export interface Source<T extends TypesGeneric = CoreSource.Types>
  extends CoreSource.Instance<T> {
  settings?: CoreSource.Settings<T>;
  mapping?: CoreSource.Mapping<T>;
}

export type Init = Partial<Omit<Source, 'init'>> & Pick<Source, 'type'>;

export type Config<T extends TypesGeneric = CoreSource.Types> =
  CoreSource.Instance<T> & {
    settings: CoreSource.Settings<T>;
    mapping?: CoreSource.Mapping<T>;
  };

export type PartialConfig<T extends TypesGeneric = CoreSource.Types> = Partial<
  Config<T>
>;

export type InitFn<T extends TypesGeneric = CoreSource.Types> = (
  collector: Collector.Instance,
  config: Config<T>,
) => void | Promise<void>;
