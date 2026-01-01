import type { Collector, Processor, WalkerOS } from '@walkeros/core';
import { isObject, tryCatchAsync, useHooks } from '@walkeros/core';

/**
 * Resolved processor chains for a flow.
 */
export interface ProcessorChain {
  /** Ordered processor IDs to run before collector (from source.next) */
  pre: string[];
  /** Per-destination processor chains (from destination.before) */
  post: Record<string, string[]>;
}

/**
 * Extended collector with processor support.
 */
export interface CollectorWithProcessors extends Collector.Instance {
  processors: Processor.Processors;
  processorChain: ProcessorChain;
}

/**
 * Resolves processor chains from flow configuration.
 * Builds ordered arrays of processor IDs for pre-collector and per-destination chains.
 *
 * @param sources - Source configurations with optional next property
 * @param destinations - Destination configurations with optional before property
 * @param processors - Processor configurations with optional next property
 * @returns Resolved processor chains
 */
export function resolveProcessorGraph(
  sources: Record<string, { next?: string }> = {},
  destinations: Record<string, { before?: string }> = {},
  processors: Record<string, { next?: string }> = {},
): ProcessorChain {
  const pre: string[] = [];
  const post: Record<string, string[]> = {};
  const visited = new Set<string>();

  /**
   * Walks a processor chain starting from a given processor ID.
   * Detects circular references.
   */
  function walkChain(startId: string | undefined): string[] {
    const chain: string[] = [];
    let current = startId;

    while (current && processors[current]) {
      if (visited.has(current)) {
        // Circular reference detected - stop walking
        break;
      }
      visited.add(current);
      chain.push(current);
      current = processors[current].next;
    }

    // Reset visited for next chain walk
    visited.clear();
    return chain;
  }

  // Build pre-collector chain from sources
  // All sources with 'next' contribute to the same pre-collector chain
  for (const source of Object.values(sources)) {
    if (source.next) {
      const chain = walkChain(source.next);
      // Merge chains - in practice, sources should share the same pre-collector chain
      for (const processorId of chain) {
        if (!pre.includes(processorId)) {
          pre.push(processorId);
        }
      }
    }
  }

  // Build post-collector chains from destinations
  for (const [destName, dest] of Object.entries(destinations)) {
    if (dest.before) {
      post[destName] = walkChain(dest.before);
    }
  }

  return { pre, post };
}

/**
 * Initializes processor instances from configuration.
 * Does NOT call processor.init() - that happens lazily before first push.
 *
 * @param collector - The collector instance
 * @param initProcessors - Processor initialization configurations
 * @returns Initialized processor instances
 */
export async function initProcessors(
  _collector: Collector.Instance,
  initProcessors: Processor.InitProcessors = {},
): Promise<Processor.Processors> {
  const result: Processor.Processors = {};

  for (const [name, processorDef] of Object.entries(initProcessors)) {
    const { code, config = {}, env = {} } = processorDef;

    // Initialize the processor instance
    const instance = await code(config, env as Processor.Env);

    result[name] = instance;
  }

  return result;
}

/**
 * Initializes a processor if it hasn't been initialized yet.
 * Called lazily before first push.
 *
 * @param collector - The collector instance
 * @param processor - The processor to initialize
 * @returns Whether initialization succeeded
 */
export async function processorInit(
  collector: Collector.Instance,
  processor: Processor.Instance,
): Promise<boolean> {
  // Check if already initialized
  if (processor.init && !processor.config.init) {
    const processorType = processor.type || 'unknown';
    const processorLogger = collector.logger.scope(
      `processor:${processorType}`,
    );

    const context: Processor.Context = {
      collector,
      config: processor.config,
      env: mergeProcessorEnvironments(processor.config.env),
      logger: processorLogger,
    };

    processorLogger.debug('init');

    const configResult = await useHooks(
      processor.init,
      'ProcessorInit',
      collector.hooks,
    )(context);

    // Check for initialization failure
    if (configResult === false) return false;

    // Update config if returned
    processor.config = {
      ...(configResult || processor.config),
      init: true,
    };

    processorLogger.debug('init done');
  }

  return true;
}

/**
 * Pushes an event through a single processor.
 *
 * @param collector - The collector instance
 * @param processor - The processor to push to
 * @param event - The event to process
 * @returns The processed event, void for passthrough, or false to stop chain
 */
export async function processorPush(
  collector: Collector.Instance,
  processor: Processor.Instance,
  event: WalkerOS.DeepPartialEvent,
): Promise<WalkerOS.DeepPartialEvent | false | void> {
  const processorType = processor.type || 'unknown';
  const processorLogger = collector.logger.scope(`processor:${processorType}`);

  const context: Processor.Context = {
    collector,
    config: processor.config,
    env: mergeProcessorEnvironments(processor.config.env),
    logger: processorLogger,
  };

  processorLogger.debug('push', { event: (event as { name?: string }).name });

  const result = await useHooks(
    processor.push,
    'ProcessorPush',
    collector.hooks,
  )(event, context);

  processorLogger.debug('push done');

  return result;
}

/**
 * Runs an event through a chain of processors.
 *
 * @param collector - The collector instance with processors
 * @param processors - Map of processor instances
 * @param chain - Ordered array of processor IDs to execute
 * @param event - The event to process
 * @returns The processed event or null if chain was stopped
 */
export async function runProcessorChain(
  collector: Collector.Instance,
  processors: Processor.Processors,
  chain: string[],
  event: WalkerOS.DeepPartialEvent,
): Promise<WalkerOS.DeepPartialEvent | null> {
  let processedEvent = event;

  for (const processorName of chain) {
    const processor = processors[processorName];
    if (!processor) {
      collector.logger.info(`Processor not found: ${processorName}`);
      continue;
    }

    // Initialize processor if needed
    const isInitialized = await tryCatchAsync(processorInit)(
      collector,
      processor,
    );

    if (!isInitialized) {
      collector.logger.info(`Processor init failed: ${processorName}`);
      return null; // Stop chain on init failure
    }

    // Run the processor
    const result = await tryCatchAsync(processorPush, (err) => {
      collector.logger
        .scope(`processor:${processor.type || 'unknown'}`)
        .error('Push failed', { error: err });
      return undefined; // Continue chain on error (processor should handle its own errors)
    })(collector, processor, processedEvent);

    // Handle result
    if (result === false) {
      // Processor explicitly stopped the chain
      return null;
    }

    if (result !== undefined) {
      // Processor returned a modified event
      processedEvent = result;
    }
    // If result is undefined (void), continue with current event unchanged
  }

  return processedEvent;
}

/**
 * Merges processor environments.
 */
function mergeProcessorEnvironments(configEnv?: Processor.Env): Processor.Env {
  if (!configEnv) return {};
  if (isObject(configEnv)) return configEnv;
  return {};
}
