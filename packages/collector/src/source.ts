import type { Collector, Source, WalkerOS } from '@walkeros/core';
import { getMappingValue, tryCatchAsync } from '@walkeros/core';
import { walkChain, extractTransformerNextMap } from './transformer';
import { normalizeBeforeConditions } from './before';

/**
 * Initialize a single source. Extracted from the initSources loop body
 * so it can be reused by the pending-source activator.
 */
export async function initSource(
  collector: Collector.Instance,
  sourceId: string,
  sourceDefinition: Source.InitSource,
): Promise<Source.Instance | undefined> {
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
    return collector.push(event, {
      ...options,
      id: sourceId,
      ingest: currentIngest,
      mapping: config,
      preChain,
    });
  };

  // Create initial logger scoped to sourceId (type will be added after init)
  const initialLogger = collector.logger.scope('source').scope(sourceId);

  const cleanEnv: Source.Env = {
    push: wrappedPush,
    command: collector.command,
    sources: collector.sources,
    elb: collector.sources.elb.push,
    logger: initialLogger,
    ...env,
  };

  /**
   * setIngest extracts metadata from raw request using config.ingest mapping.
   * Opt-in: returns early if no config.ingest is defined.
   */
  const setIngest = async (value: unknown): Promise<void> => {
    if (!config.ingest) {
      currentIngest = undefined;
      return;
    }

    currentIngest = await getMappingValue(value, config.ingest, {
      collector,
    });
  };

  const sourceContext: Source.Context = {
    collector,
    logger: initialLogger,
    id: sourceId,
    config,
    env: cleanEnv,
    setIngest,
  };

  const sourceInstance = await tryCatchAsync(code)(sourceContext);
  if (!sourceInstance) return undefined;

  const sourceType = sourceInstance.type || 'unknown';
  const sourceLogger = collector.logger.scope(sourceType).scope(sourceId);
  cleanEnv.logger = sourceLogger;

  if (primary) {
    sourceInstance.config = { ...sourceInstance.config, primary };
  }

  return sourceInstance;
}

/**
 * Initialize sources. Sources with `before` are deferred to pendingSources.
 */
export async function initSources(
  collector: Collector.Instance,
  sources: Source.InitSources = {},
): Promise<Collector.Sources> {
  const result: Collector.Sources = {};

  for (const [sourceId, sourceDefinition] of Object.entries(sources)) {
    const { config = {} } = sourceDefinition;

    // Defer sources that declare before conditions
    if (config.before && config.before.length > 0) {
      collector.pendingSources.push({
        id: sourceId,
        definition: sourceDefinition,
        conditions: normalizeBeforeConditions(config.before),
      });
      continue;
    }

    const sourceInstance = await initSource(
      collector,
      sourceId,
      sourceDefinition,
    );
    if (sourceInstance) {
      result[sourceId] = sourceInstance;
    }
  }

  return result;
}
