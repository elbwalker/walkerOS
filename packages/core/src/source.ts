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
  // Create full config with defaults
  const fullConfig: T = {
    type: config.type,
    id: config.id ?? `${config.type}_${getId(5)}`,
    disabled: config.disabled ?? false,
    settings: config.settings ?? {},
    onError:
      config.onError ??
      ((err: unknown) => {
        console.error(`Source ${config.type} error:`, err);
      }),
  } as T;

  // If source is disabled, return a no-op source
  if (fullConfig.disabled) {
    const noopSource: Source.Instance<T> = {
      id: fullConfig.id!,
      type: fullConfig.type,
      config: fullConfig,
      collector,
    };

    const noopElb = (() =>
      Promise.resolve({ ok: false, reason: 'Source disabled' })) as E;

    return {
      source: noopSource,
      elb: noopElb,
    };
  }

  // Wrap source initialization with error handling
  const wrappedInit = tryCatchAsync(
    source,
    fullConfig.onError ||
      ((err: unknown) => {
        console.error(`Source ${fullConfig.type} error:`, err);
      }),
    () => {
      // Optional cleanup logic
    },
  );

  // Initialize the source
  const result = await wrappedInit(collector, fullConfig);

  if (!result) {
    throw new Error(`Failed to initialize source: ${fullConfig.type}`);
  }

  // Register the source in the collector
  collector.sources[result.source.id] = {
    type: result.source.type,
    settings: fullConfig.settings,
    mapping: undefined, // Sources handle their own mapping
  };

  return result;
}
