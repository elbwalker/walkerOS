import type { Collector, Elb, Logger, WalkerOS } from '@walkeros/core';
import { assign, createCauseLog, createLogger } from '@walkeros/core';
import { commonHandleCommand, prepareEvent } from './handle';
import { initDestinations } from './destination';
import { checkChainTargets, initTransformers } from './transformer';
import { createPush } from './push';
import { createCommand } from './command';
import { createElb } from './elb';
import { initSources } from './source';
import { initStores, resolveStoreReferences } from './store';
import { createCacheStore } from './cache-store';

export async function collector(
  initConfig: Collector.InitConfig,
): Promise<Collector.Instance> {
  const defaultConfig: Collector.Config = {
    globalsStatic: {},
    sessionStatic: {},
    run: true,
    queueMax: 1_000,
    consentDenied: 'queue',
  };

  const config: Collector.Config = assign(defaultConfig, initConfig, {
    merge: false,
    extend: false,
  });

  // Create logger with config from initConfig
  const loggerConfig: Logger.Config = {
    level: initConfig.logger?.level,
    handler: initConfig.logger?.handler,
  };
  const logger = createLogger(loggerConfig);

  // Enhanced globals with static globals from config
  const finalGlobals = { ...config.globalsStatic, ...initConfig.globals };

  const collector: Collector.Instance = {
    allowed: false,
    config,
    consent: initConfig.consent || {},
    custom: initConfig.custom || {},
    destinations: {},
    transformers: {},
    stores: {},
    globals: finalGlobals,
    hooks: initConfig.hooks || {},
    observers: new Set(),
    logger,
    // The one cause log: every failure line, one per cause per minute.
    causeLog: createCauseLog(logger),
    on: {},
    queue: [],
    preRunQueue: [],
    round: 0,
    count: 0,
    stateVersion: 0,
    cellVersion: {},
    delivery: new WeakMap(),
    session: undefined,
    status: {
      startedAt: Date.now(),
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
      connectionErrors: {},
      breakers: {},
    },
    timing: Date.now(),
    user: initConfig.user || {},
    sources: {},
    pending: { destinations: {} },
    hasShutdown: false,
    seenEvents: new Set(),
    push: undefined as unknown as Collector.PushFn, // Placeholder, will be set below
    command: undefined as unknown as Collector.CommandFn, // Placeholder, will be set below
    elb: undefined as unknown as Elb.Fn, // Placeholder, will be set below
  };

  // Mirror static flow identity from initConfig onto the instance.
  // `assign(defaultConfig, initConfig, { extend: false })` copies a key only
  // if it already exists in defaultConfig, so name/release never reach
  // `collector.config`; read them from initConfig directly, once, at
  // construction (they are static, unlike the per-run `trace`).
  if (initConfig.name !== undefined) collector.name = initConfig.name;
  if (initConfig.release !== undefined) collector.release = initConfig.release;

  // `next` has no default, so the `extend: false` assign above drops it; seed
  // the collector chain explicitly.
  if (initConfig.next !== undefined) config.next = initConfig.next;

  // Set the push and command functions with the collector reference
  collector.push = createPush(collector, (event) =>
    prepareEvent(collector, event),
  );

  collector.command = createCommand(collector, commonHandleCommand);

  // Attach the elb adapter so it exists before any source init
  collector.elb = createElb(collector);

  // Initialize stores (first - other components may depend on them).
  // Build flag (see @walkeros/core build-flags): a lean bundle without
  // declared stores folds this out; the default `__cache` below always stays.
  const rawStores = initConfig.stores || {};
  if (typeof __WALKEROS_STORES__ === 'undefined' || __WALKEROS_STORES__) {
    collector.stores = await initStores(collector, rawStores);

    // Resolve store references in component env values.
    // The bundler emits `$store.gcs` as a direct reference to `stores.gcs`
    // (the raw {code, config} definition). After initialization, replace
    // these raw references with the actual Store.Instance objects.
    resolveStoreReferences(rawStores, collector.stores, initConfig);
  } else if (Object.keys(rawStores).length > 0) {
    logger.error('stores: not in this build, config ignored');
  }

  // Create default cache store for steps that use cache without explicit store.
  // Uses LRU + entry cap + batched eviction + active TTL sweep. See
  // `cache-store.ts` for the full semantics.
  if (!collector.stores.__cache) {
    collector.stores.__cache = createCacheStore();
  }

  // Initialize destinations after collector is fully created
  // Sources are initialized in startFlow after ELB source is created
  collector.destinations = await initDestinations(
    collector,
    initConfig.destinations || {},
  );

  // Initialize transformers
  collector.transformers = await initTransformers(
    collector,
    initConfig.transformers || {},
  );

  // Registration check of every chain known now: each transformer it names
  // must exist (one ERROR per missing id, not one per event). Build flag:
  // CLI bundles check routes at build time and fold this out; the runtime
  // still names a missing id once when an event meets it.
  if (typeof __WALKEROS_VALIDATE__ === 'undefined' || __WALKEROS_VALIDATE__) {
    checkChainTargets(collector, 'collector.next', config.next);
    for (const [id, destination] of Object.entries(collector.destinations)) {
      checkChainTargets(
        collector,
        `destination.${id}.before`,
        destination.config.before,
      );
      checkChainTargets(
        collector,
        `destination.${id}.next`,
        destination.config.next,
      );
    }
    for (const [id, transformer] of Object.entries(collector.transformers)) {
      checkChainTargets(
        collector,
        `transformer.${id}.before`,
        transformer.config.before,
      );
      checkChainTargets(
        collector,
        `transformer.${id}.next`,
        transformer.config.next,
      );
    }
  }

  return collector;
}
