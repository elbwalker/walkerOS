import type { Collector, WalkerOS, Source } from '@walkerOS/core';
import { tryCatchAsync, getId } from '@walkerOS/core';

/**
 * Core source factory function that creates sources with consistent error handling and lifecycle management.
 *
 * @template T - The source configuration type
 * @param collector - The WalkerOS collector instance
 * @param source - The source function
 * @param config - The source configuration
 * @returns Promise resolving to the created source with its elb function
 */
export async function createSource<
  T extends Source.Config,
  E = WalkerOS.AnyFunction,
>(
  collector: Collector.Instance,
  source: Source.Init<T, E>,
  config: Source.InitConfig,
): Promise<Source.CreateSource<T, E>> {
  const fullConfig: T = {
    disabled: config.disabled ?? false,
    settings: config.settings ?? {},
    onError: config.onError, // TODO: add default onError
  } as T;

  if (fullConfig.disabled) return {};

  // Initialize the source
  const result = await tryCatchAsync(source)(collector, fullConfig);

  if (!result || !result.source) return {};

  const type = fullConfig.type || result.source.type || '';
  const id = config.id || `${type}_${getId(5)}`;

  // Store the elb function on the source instance for easy access
  if (result.source && result.elb) {
    const sourceWithElb = result.source as Source.Instance & { elb?: E };
    sourceWithElb.elb = result.elb;
  }

  // Register the source in the collector
  collector.sources[id] = {
    type,
    settings: fullConfig.settings,
    mapping: undefined, // Sources handle their own mapping
    elb: result.elb as WalkerOS.AnyFunction | undefined,
  };

  return result;
}

// Types for source initialization
export interface SourceInit<
  T extends Source.Config = Source.Config,
  E = WalkerOS.AnyFunction,
> {
  code: Source.Init<T, E>;
  config?: Partial<T>;
}

export interface InitSources {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [sourceId: string]: SourceInit<any, any>;
}

/**
 * Initialize multiple sources for a collector
 *
 * @param collector - The WalkerOS collector instance
 * @param sources - Map of source configurations
 */
export async function initSources(
  collector: Collector.Instance,
  sources: InitSources = {},
): Promise<void> {
  for (const [sourceId, initSource] of Object.entries(sources)) {
    const { code, config = {} } = initSource;

    const fullConfig: Source.InitConfig = {
      id: sourceId,
      ...config,
    };

    const result = await createSource(collector, code, fullConfig);

    if (result.source) {
      // Store source with elb attached
      if (result.elb) {
        const sourceWithElb = result.source as Source.Instance & {
          elb?: WalkerOS.AnyFunction;
        };
        sourceWithElb.elb = result.elb;
      }
      // Store as CollectorSource format
      collector.sources[sourceId] = {
        type: result.source.type,
        settings: result.source.config.settings,
        mapping: undefined,
        elb: result.elb as WalkerOS.AnyFunction | undefined,
      };
    }
  }
}
