import type { Collector, Source, WalkerOS } from '@walkeros/core';
import { tryCatchAsync } from '@walkeros/core';

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
    const { code, config = {}, env = {}, primary } = sourceDefinition;

    // Create wrapped push that auto-applies source mapping config
    const wrappedPush: Collector.PushFn = (
      event: WalkerOS.DeepPartialEvent,
      context: Collector.PushContext = {},
    ) => {
      // Pass source config as mapping in context
      return collector.push(event, {
        ...context,
        mapping: config,
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

    // Call source function with config and environment separately
    const sourceInstance = await tryCatchAsync(code)(config, cleanEnv);

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
