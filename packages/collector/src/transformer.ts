import type { Collector, Transformer, WalkerOS } from '@walkeros/core';
import { isObject, tryCatchAsync, useHooks } from '@walkeros/core';

/**
 * Resolved transformer chains for a flow.
 */
export interface TransformerChain {
  /** Ordered transformer IDs to run before collector (from source.next) */
  pre: string[];
  /** Per-destination transformer chains (from destination.before) */
  post: Record<string, string[]>;
}

/**
 * Extended collector with transformer support.
 */
export interface CollectorWithTransformers extends Collector.Instance {
  transformers: Transformer.Transformers;
  transformerChain: TransformerChain;
}

/**
 * Walks a transformer chain starting from a given transformer ID.
 * Returns ordered array of transformer IDs in the chain.
 *
 * @param startId - First transformer in chain
 * @param transformers - Available transformer configs with optional `next` field
 * @returns Ordered array of transformer IDs
 */
export function walkChain(
  startId: string | undefined,
  transformers: Record<string, { next?: string }> = {},
): string[] {
  if (!startId) return [];

  const chain: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = startId;

  while (current && transformers[current]) {
    if (visited.has(current)) {
      // Circular reference detected - stop walking
      break;
    }
    visited.add(current);
    chain.push(current);
    current = transformers[current].next;
  }

  return chain;
}

/**
 * Resolves transformer chains from flow configuration.
 * Builds per-destination post-collector chains.
 * Note: Pre-chains are now resolved per-source in source.ts
 *
 * @param sources - Source configurations (unused, kept for API compatibility)
 * @param destinations - Destination configurations with optional before property
 * @param transformers - Transformer configurations with optional next property
 * @returns Resolved transformer chains
 */
export function resolveTransformerGraph(
  _sources: Record<string, { next?: string }> = {},
  destinations: Record<string, { before?: string }> = {},
  transformers: Record<string, { next?: string }> = {},
): TransformerChain {
  const post: Record<string, string[]> = {};

  // Build post-collector chains from destinations
  for (const [destName, dest] of Object.entries(destinations)) {
    if (dest.before) {
      post[destName] = walkChain(dest.before, transformers);
    }
  }

  // Note: pre-chains are now resolved per-source in source.ts
  return { pre: [], post };
}

/**
 * Initializes transformer instances from configuration.
 * Does NOT call transformer.init() - that happens lazily before first push.
 *
 * @param collector - The collector instance
 * @param initTransformers - Transformer initialization configurations
 * @returns Initialized transformer instances
 */
export async function initTransformers(
  collector: Collector.Instance,
  initTransformers: Transformer.InitTransformers = {},
): Promise<Transformer.Transformers> {
  const result: Transformer.Transformers = {};

  for (const [transformerId, transformerDef] of Object.entries(
    initTransformers,
  )) {
    const { code, config = {}, env = {} } = transformerDef;

    // Build transformer context for init
    const transformerLogger = collector.logger
      .scope('transformer')
      .scope(transformerId);

    const context = {
      collector,
      logger: transformerLogger,
      id: transformerId,
      config,
      env: env as Transformer.Env,
    };

    // Initialize the transformer instance with context
    const instance = await code(context);

    result[transformerId] = instance;
  }

  return result;
}

/**
 * Initializes a transformer if it hasn't been initialized yet.
 * Called lazily before first push.
 *
 * @param collector - The collector instance
 * @param transformer - The transformer to initialize
 * @param transformerId - The transformer ID
 * @returns Whether initialization succeeded
 */
export async function transformerInit(
  collector: Collector.Instance,
  transformer: Transformer.Instance,
  transformerId: string,
): Promise<boolean> {
  // Check if already initialized
  if (transformer.init && !transformer.config.init) {
    const transformerType = transformer.type || 'unknown';
    const transformerLogger = collector.logger.scope(
      `transformer:${transformerType}`,
    );

    const context: Transformer.Context = {
      collector,
      logger: transformerLogger,
      id: transformerId,
      config: transformer.config,
      env: mergeTransformerEnvironments(transformer.config.env),
    };

    transformerLogger.debug('init');

    const configResult = await useHooks(
      transformer.init,
      'TransformerInit',
      collector.hooks,
    )(context);

    // Check for initialization failure
    if (configResult === false) return false;

    // Update config if returned
    transformer.config = {
      ...(configResult || transformer.config),
      init: true,
    };

    transformerLogger.debug('init done');
  }

  return true;
}

/**
 * Pushes an event through a single transformer.
 *
 * @param collector - The collector instance
 * @param transformer - The transformer to push to
 * @param transformerId - The transformer ID
 * @param event - The event to process
 * @param ingest - Optional ingest metadata (frozen, same reference)
 * @returns The processed event, void for passthrough, or false to stop chain
 */
export async function transformerPush(
  collector: Collector.Instance,
  transformer: Transformer.Instance,
  transformerId: string,
  event: WalkerOS.DeepPartialEvent,
  ingest?: unknown,
): Promise<WalkerOS.DeepPartialEvent | false | void> {
  const transformerType = transformer.type || 'unknown';
  const transformerLogger = collector.logger.scope(
    `transformer:${transformerType}`,
  );

  const context: Transformer.Context = {
    collector,
    logger: transformerLogger,
    id: transformerId,
    ingest, // Same frozen reference, no copying
    config: transformer.config,
    env: mergeTransformerEnvironments(transformer.config.env),
  };

  transformerLogger.debug('push', { event: (event as { name?: string }).name });

  const result = await useHooks(
    transformer.push,
    'TransformerPush',
    collector.hooks,
  )(event, context);

  transformerLogger.debug('push done');

  return result;
}

/**
 * Runs an event through a chain of transformers.
 *
 * @param collector - The collector instance with transformers
 * @param transformers - Map of transformer instances
 * @param chain - Ordered array of transformer IDs to execute
 * @param event - The event to process
 * @param ingest - Optional ingest metadata (frozen, same reference)
 * @returns The processed event or null if chain was stopped
 */
export async function runTransformerChain(
  collector: Collector.Instance,
  transformers: Transformer.Transformers,
  chain: string[],
  event: WalkerOS.DeepPartialEvent,
  ingest?: unknown,
): Promise<WalkerOS.DeepPartialEvent | null> {
  let processedEvent = event;

  for (const transformerName of chain) {
    const transformer = transformers[transformerName];
    if (!transformer) {
      collector.logger.info(`Transformer not found: ${transformerName}`);
      continue;
    }

    // Initialize transformer if needed
    const isInitialized = await tryCatchAsync(transformerInit)(
      collector,
      transformer,
      transformerName,
    );

    if (!isInitialized) {
      collector.logger.info(`Transformer init failed: ${transformerName}`);
      return null; // Stop chain on init failure
    }

    // Run the transformer
    const result = (await tryCatchAsync(transformerPush, (err) => {
      collector.logger
        .scope(`transformer:${transformer.type || 'unknown'}`)
        .error('Push failed', { error: err });
      return false; // Stop chain on error
    })(collector, transformer, transformerName, processedEvent, ingest)) as
      | WalkerOS.DeepPartialEvent
      | false
      | void;

    // Handle result
    if (result === false) {
      // Transformer explicitly stopped the chain
      return null;
    }

    if (result !== undefined) {
      // Transformer returned a modified event
      processedEvent = result;
    }
    // If result is undefined (void), continue with current event unchanged
  }

  return processedEvent;
}

/**
 * Merges transformer environments.
 */
function mergeTransformerEnvironments(
  configEnv?: Transformer.Env,
): Transformer.Env {
  if (!configEnv) return {};
  if (isObject(configEnv)) return configEnv;
  return {};
}
