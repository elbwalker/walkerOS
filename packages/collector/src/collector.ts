import type { Collector, Elb, Logger, WalkerOS } from '@walkeros/core';
import { assign, createLogger } from '@walkeros/core';
import { commonHandleCommand, prepareEvent } from './handle';
import { initDestinations } from './destination';
import { initTransformers } from './transformer';
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
    on: {},
    queue: [],
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

  // Set the push and command functions with the collector reference
  collector.push = createPush(collector, (event) =>
    prepareEvent(collector, event),
  );

  collector.command = createCommand(collector, commonHandleCommand);

  // Attach the elb adapter so it exists before any source init
  collector.elb = createElb(collector);

  // Initialize stores (first - other components may depend on them)
  const rawStores = initConfig.stores || {};
  collector.stores = await initStores(collector, rawStores);

  // Resolve store references in component env values.
  // The bundler emits `$store.gcs` as a direct reference to `stores.gcs`
  // (the raw {code, config} definition). After initialization, replace
  // these raw references with the actual Store.Instance objects.
  resolveStoreReferences(rawStores, collector.stores, initConfig);

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

  return collector;
}
