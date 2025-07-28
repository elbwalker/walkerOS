import type { Collector, WalkerOS, Source as CoreSource } from '@walkeros/core';

export interface Source<
  Settings extends Record<string, unknown> = Record<string, unknown>,
  Mapping = unknown,
> extends CoreSource.Instance {
  settings?: Settings;
  mapping?: Mapping;
}

export type Init = Partial<Omit<Source, 'init'>> & Pick<Source, 'type'>;

export type Config<
  Settings extends Record<string, unknown> = Record<string, unknown>,
  Mapping = unknown,
> = CoreSource.Instance & {
  settings: Settings;
  mapping?: Mapping;
};

export type PartialConfig<
  Settings extends Record<string, unknown> = Record<string, unknown>,
  Mapping = unknown,
> = Partial<Config<Settings, Mapping>>;

export type InitFn<
  Settings extends Record<string, unknown> = Record<string, unknown>,
  Mapping = unknown,
> = (
  collector: Collector.Instance,
  config: Config<Settings, Mapping>,
) => void | Promise<void>;
