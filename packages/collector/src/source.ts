import type { Collector, Source, WalkerOS } from '@walkeros/core';
import { getMappingValue, tryCatchAsync } from '@walkeros/core';
import { walkChain } from './transformer';

/**
 * Extracts a simple {id: {next}} map from transformer instances.
 * Used for chain resolution.
 */
function extractTransformerNextMap(
  transformers: Record<string, { config: { next?: string } }>,
): Record<string, { next?: string }> {
  const result: Record<string, { next?: string }> = {};
  for (const [id, transformer] of Object.entries(transformers)) {
    result[id] = { next: transformer.config.next };
  }
  return result;
}

/**
 * Initialize sources using the code/config/env pattern
 *
 * @param collector - The WalkerOS collector instance
 * @param sources - Map of source definitions with code/config/env
 * @returns Initialized sources
 */
export async function initSources(
  collector: Collector.Instance,
  sources: Source.InitSources = {},
): Promise<Collector.Sources> {
  const result: Collector.Sources = {};

  for (const [sourceId, sourceDefinition] of Object.entries(sources)) {
    const { code, config = {}, env = {}, primary, next } = sourceDefinition;

    // Track current ingest metadata (set per-request by setIngest)
    let currentIngest: unknown = undefined;

    // Resolve transformer chain for this source
    const preChain = walkChain(
      next,
      extractTransformerNextMap(collector.transformers),
    );

    // Create wrapped push that auto-applies source mapping config, preChain, and ingest
    const wrappedPush: Collector.PushFn = (
      event: WalkerOS.DeepPartialEvent,
      options: Collector.PushOptions = {},
    ) => {
      // Pass source config as mapping in options, plus resolved preChain, source id, and ingest
      return collector.push(event, {
        ...options,
        id: sourceId,
        ingest: currentIngest,
        mapping: config,
        preChain, // Source-specific transformer chain
      });
    };

    // Create initial logger scoped to sourceId (type will be added after init)
    const initialLogger = collector.logger.scope('source').scope(sourceId);

    const cleanEnv: Source.Env = {
      push: wrappedPush,
      command: collector.command,
      sources: collector.sources, // Provide access to all sources for chaining
      elb: collector.sources.elb.push, // ELB source is always available
      logger: initialLogger,
      ...env,
    };

    /**
     * setIngest extracts metadata from raw request using config.ingest mapping.
     * Opt-in: returns early if no config.ingest is defined.
     */
    const setIngest = async (value: unknown): Promise<void> => {
      // Opt-in barrier: no processing when ingest not configured
      if (!config.ingest) {
        currentIngest = undefined;
        return;
      }

      currentIngest = await getMappingValue(value, config.ingest, {
        collector,
      });
    };

    // Build source context for init
    const sourceContext: Source.Context = {
      collector,
      logger: initialLogger,
      id: sourceId,
      config,
      env: cleanEnv,
      setIngest,
    };

    // Call source function with context
    const sourceInstance = await tryCatchAsync(code)(sourceContext);

    if (!sourceInstance) continue; // Skip failed source initialization

    // Update logger with actual source type: [type:sourceId] or [unknown:sourceId]
    const sourceType = sourceInstance.type || 'unknown';
    const sourceLogger = collector.logger.scope(sourceType).scope(sourceId);
    cleanEnv.logger = sourceLogger;

    // Store the primary flag in the source config for later access
    if (primary) {
      sourceInstance.config = { ...sourceInstance.config, primary };
    }

    result[sourceId] = sourceInstance;
  }

  return result;
}
