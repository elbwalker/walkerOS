import type { WalkerOS, Source } from './types';
import { tryCatchAsync } from './tryCatch';
import { getId } from './getId';

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
  collector: WalkerOS.Collector,
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

  // Register the source in the collector
  collector.sources[id] = {
    type,
    settings: fullConfig.settings,
    mapping: undefined, // Sources handle their own mapping
  };

  return result;
}
