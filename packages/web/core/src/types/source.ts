import type { WalkerOS } from '@walkerOS/core';

export interface Source<
  Settings extends Record<string, unknown> = Record<string, unknown>,
  Mapping = unknown,
> extends WalkerOS.CollectorSource {
  settings?: Settings;
  mapping?: Mapping;
}

export type Init = Partial<Omit<Source, 'init'>> & Pick<Source, 'type'>;

export type Config<
  Settings extends Record<string, unknown> = Record<string, unknown>,
  Mapping = unknown,
> = WalkerOS.CollectorSourceConfig & {
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
  collector: WalkerOS.Collector,
  config: Config<Settings, Mapping>,
) => void | Promise<void>;
