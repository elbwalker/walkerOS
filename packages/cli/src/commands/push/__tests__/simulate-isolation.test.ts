import type {
  Collector,
  Destination,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import {
  destinationInit,
  destinationPush,
  transformerInit,
  transformerPush,
  runTransformerChain,
  walkChain,
  extractTransformerNextMap,
} from '@walkeros/collector';

/**
 * Tests for before-chain execution in transformer simulation.
 *
 * Validates the pattern: resolve before chain -> run via runTransformerChain
 * -> then call transformerPush on the main transformer.
 *
 * This mirrors the logic in executeTransformerSimulation without requiring
 * a real ESM bundle.
 */
describe('transformer simulation isolation — before chain', () => {
  function createMockCollector(
    transformers: Transformer.Transformers = {},
  ): Collector.Instance {
    const mockLogger = createMockLogger();

    return {
      transformers,
      destinations: {},
      sources: { elb: { push: jest.fn() } },
      queue: [],
      allowed: true,
      consent: {},
      globals: {},
      user: {},
      status: { in: 0, out: 0, failed: 0, destinations: {} },
      pending: { sources: {}, destinations: {} },
      hooks: {},
      logger: mockLogger,
      command: jest.fn(),
      push: jest.fn(),
    } as unknown as Collector.Instance;
  }

  function createTransformer(
    pushFn: Transformer.Instance['push'],
    config: Record<string, unknown> = {},
  ): Transformer.Instance {
    return {
      type: 'mock',
      config: { init: true, ...config },
      push: pushFn,
    };
  }

  it('runs before chain then main transformer push', async () => {
    // "enrich" transformer adds enrichment data to the event
    const enrichPush = jest.fn(
      async (event: WalkerOS.DeepPartialEvent) =>
        ({
          event: { ...event, data: { ...event.data, enriched: true } },
        }) as Transformer.Result,
    );

    // "redact" transformer receives the enriched event
    const redactPush = jest.fn(
      async (event: WalkerOS.DeepPartialEvent) =>
        ({
          event: { ...event, data: { ...event.data, redacted: true } },
        }) as Transformer.Result,
    );

    const enrichTransformer = createTransformer(enrichPush);
    const redactTransformer = createTransformer(redactPush, {
      before: 'enrich',
    });

    const transformers: Transformer.Transformers = {
      enrich: enrichTransformer,
      redact: redactTransformer,
    };

    const collector = createMockCollector(transformers);
    const transformerId = 'redact';
    const transformer = transformers[transformerId];
    const ingest = createIngest(transformerId);

    const inputEvent = {
      name: 'page view',
      data: { url: '/home' },
    } as WalkerOS.DeepPartialEvent;

    // Step 1: Resolve before chain
    const before = transformer.config.before;
    const beforeChainIds = walkChain(
      before as string | string[],
      extractTransformerNextMap(transformers),
    );
    expect(beforeChainIds).toEqual(['enrich']);

    // Step 2: Run before chain
    let processedEvent: WalkerOS.DeepPartialEvent = inputEvent;
    const beforeResult = await runTransformerChain(
      collector,
      transformers,
      beforeChainIds,
      processedEvent,
      ingest,
      undefined,
      `transformer.${transformerId}.before`,
    );

    expect(beforeResult).not.toBeNull();
    processedEvent = (
      Array.isArray(beforeResult) ? beforeResult![0] : beforeResult
    ) as WalkerOS.DeepPartialEvent;

    // Verify enrichment was applied
    expect(processedEvent.data).toEqual({ url: '/home', enriched: true });

    // Step 3: Push through main transformer
    const pushResult = await transformerPush(
      collector,
      transformer,
      transformerId,
      processedEvent,
      ingest,
    );

    // Verify the main transformer received the enriched event
    expect(redactPush).toHaveBeenCalledTimes(1);
    const receivedEvent = redactPush.mock.calls[0][0];
    expect(receivedEvent.data).toEqual({ url: '/home', enriched: true });

    // Verify final result has both enrichment and redaction
    expect(pushResult).toEqual({
      event: {
        name: 'page view',
        data: { url: '/home', enriched: true, redacted: true },
      },
    });
  });

  it('skips before chain when none is configured', async () => {
    const mainPush = jest.fn(
      async (event: WalkerOS.DeepPartialEvent) =>
        ({
          event: { ...event, data: { ...event.data, processed: true } },
        }) as Transformer.Result,
    );

    const mainTransformer = createTransformer(mainPush);
    const transformers: Transformer.Transformers = { main: mainTransformer };
    const collector = createMockCollector(transformers);
    const transformerId = 'main';
    const transformer = transformers[transformerId];
    const ingest = createIngest(transformerId);

    const inputEvent = {
      name: 'product add',
      data: { id: '42' },
    } as WalkerOS.DeepPartialEvent;

    // No before chain configured
    const before = transformer.config.before;
    expect(before).toBeUndefined();

    // Direct push (no chain resolution needed)
    let processedEvent: WalkerOS.DeepPartialEvent = inputEvent;

    const pushResult = await transformerPush(
      collector,
      transformer,
      transformerId,
      processedEvent,
      ingest,
    );

    // Main transformer received the original event unchanged
    expect(mainPush).toHaveBeenCalledTimes(1);
    const receivedEvent = mainPush.mock.calls[0][0];
    expect(receivedEvent.data).toEqual({ id: '42' });

    // Result reflects main transformer's processing only
    expect(pushResult).toEqual({
      event: {
        name: 'product add',
        data: { id: '42', processed: true },
      },
    });
  });

  it('returns null when before chain drops the event', async () => {
    // "gate" transformer drops the event (returns false)
    const gatePush = jest.fn(async () => false as const);

    // "main" transformer should never be called
    const mainPush = jest.fn(
      async (event: WalkerOS.DeepPartialEvent) =>
        ({ event }) as Transformer.Result,
    );

    const gateTransformer = createTransformer(gatePush);
    const mainTransformer = createTransformer(mainPush, { before: 'gate' });

    const transformers: Transformer.Transformers = {
      gate: gateTransformer,
      main: mainTransformer,
    };

    const collector = createMockCollector(transformers);
    const transformerId = 'main';
    const transformer = transformers[transformerId];
    const ingest = createIngest(transformerId);

    const inputEvent = {
      name: 'user login',
      data: {},
    } as WalkerOS.DeepPartialEvent;

    // Resolve before chain
    const before = transformer.config.before;
    const beforeChainIds = walkChain(
      before as string | string[],
      extractTransformerNextMap(transformers),
    );
    expect(beforeChainIds).toEqual(['gate']);

    // Run before chain — gate drops the event
    const beforeResult = await runTransformerChain(
      collector,
      transformers,
      beforeChainIds,
      inputEvent,
      ingest,
      undefined,
      `transformer.${transformerId}.before`,
    );

    // Chain returned null (event was dropped)
    expect(beforeResult).toBeNull();

    // Main transformer should NOT be called when before chain drops
    expect(mainPush).not.toHaveBeenCalled();
  });

  it('handles multi-step before chain', async () => {
    // Chain: validate -> enrich -> (then main)
    const validatePush = jest.fn(
      async (event: WalkerOS.DeepPartialEvent) =>
        ({
          event: { ...event, data: { ...event.data, valid: true } },
        }) as Transformer.Result,
    );

    const enrichPush = jest.fn(
      async (event: WalkerOS.DeepPartialEvent) =>
        ({
          event: { ...event, data: { ...event.data, enriched: true } },
        }) as Transformer.Result,
    );

    const mainPush = jest.fn(
      async (event: WalkerOS.DeepPartialEvent) =>
        ({ event }) as Transformer.Result,
    );

    const validateTransformer = createTransformer(validatePush, {
      next: 'enrich',
    });
    const enrichTransformer = createTransformer(enrichPush);
    const mainTransformer = createTransformer(mainPush, {
      before: 'validate',
    });

    const transformers: Transformer.Transformers = {
      validate: validateTransformer,
      enrich: enrichTransformer,
      main: mainTransformer,
    };

    const collector = createMockCollector(transformers);
    const transformerId = 'main';
    const transformer = transformers[transformerId];
    const ingest = createIngest(transformerId);

    const inputEvent = {
      name: 'order complete',
      data: { total: 100 },
    } as WalkerOS.DeepPartialEvent;

    // Resolve before chain — should follow validate -> enrich via next link
    const before = transformer.config.before;
    const beforeChainIds = walkChain(
      before as string | string[],
      extractTransformerNextMap(transformers),
    );
    expect(beforeChainIds).toEqual(['validate', 'enrich']);

    // Run before chain
    const beforeResult = await runTransformerChain(
      collector,
      transformers,
      beforeChainIds,
      inputEvent,
      ingest,
      undefined,
      `transformer.${transformerId}.before`,
    );

    expect(beforeResult).not.toBeNull();
    const processedEvent = (
      Array.isArray(beforeResult) ? beforeResult![0] : beforeResult
    ) as WalkerOS.DeepPartialEvent;

    // Both validate and enrich ran
    expect(processedEvent.data).toEqual({
      total: 100,
      valid: true,
      enriched: true,
    });

    // Push through main transformer
    const pushResult = await transformerPush(
      collector,
      transformer,
      transformerId,
      processedEvent,
      ingest,
    );

    // Main received the fully enriched event
    expect(mainPush).toHaveBeenCalledTimes(1);
    const receivedEvent = mainPush.mock.calls[0][0];
    expect(receivedEvent.data).toEqual({
      total: 100,
      valid: true,
      enriched: true,
    });
  });
});

/**
 * Tests for destination simulation with isolated push.
 *
 * Validates the pattern: before chain → destinationInit → destinationPush.
 * No collector.push call should happen — the destination is called directly.
 *
 * This mirrors the isolated path in executeDestinationPush when a simulated
 * destination is detected (overrides.destinations with mock set).
 */
describe('destination simulation with before chain', () => {
  function createMockCollector(
    transformers: Transformer.Transformers = {},
    destinations: Collector.Destinations = {},
  ): Collector.Instance {
    const mockLogger = createMockLogger();

    return {
      transformers,
      destinations,
      sources: { elb: { push: jest.fn() } },
      queue: [],
      allowed: true,
      consent: {},
      globals: {},
      user: {},
      status: { in: 0, out: 0, failed: 0, destinations: {} },
      pending: { sources: {}, destinations: {} },
      hooks: {},
      logger: mockLogger,
      command: jest.fn(),
      push: jest.fn(),
    } as unknown as Collector.Instance;
  }

  function createTransformer(
    pushFn: Transformer.Instance['push'],
    config: Record<string, unknown> = {},
  ): Transformer.Instance {
    return {
      type: 'mock',
      config: { init: true, ...config },
      push: pushFn,
    };
  }

  function createDestination(
    pushFn: Destination.Instance['push'],
    config: Record<string, unknown> = {},
  ): Destination.Instance {
    return {
      type: 'mock-dest',
      config: { init: true, ...config },
      push: pushFn,
    };
  }

  it('calls destinationPush directly without collector.push', async () => {
    const destPushFn = jest.fn(async () => ({ sent: true }));
    const destination = createDestination(destPushFn, { mock: {} });

    const collector = createMockCollector({}, { ga4: destination });
    const destId = 'ga4';
    const ingest = createIngest(destId);

    const inputEvent = {
      name: 'page view',
      data: { url: '/home' },
    } as WalkerOS.Event;

    // Initialize and push directly (isolated path)
    const isInitialized = await destinationInit(collector, destination, destId);
    expect(isInitialized).toBe(true);

    const pushResult = await destinationPush(
      collector,
      destination,
      destId,
      inputEvent,
      ingest,
    );

    // destinationPush was called (mock interception returns mock value)
    // Since mock is set to {}, the mock interception in destinationPush returns {}
    expect(pushResult).toEqual({});

    // collector.push was NOT called — this is the key assertion
    expect(collector.push).not.toHaveBeenCalled();
  });

  it('runs before chain then calls destinationPush directly', async () => {
    // "enrich" transformer adds enrichment data to the event
    const enrichPush = jest.fn(
      async (event: WalkerOS.DeepPartialEvent) =>
        ({
          event: { ...event, data: { ...event.data, enriched: true } },
        }) as Transformer.Result,
    );
    const enrichTransformer = createTransformer(enrichPush);

    // Destination with before chain configured
    const destPushFn = jest.fn(async () => ({ sent: true }));
    const destination = createDestination(destPushFn, {
      mock: {},
      before: 'enrich',
    });

    const transformers: Transformer.Transformers = {
      enrich: enrichTransformer,
    };
    const collector = createMockCollector(transformers, {
      ga4: destination,
    });
    const destId = 'ga4';
    const ingest = createIngest(destId);

    const inputEvent = {
      name: 'page view',
      data: { url: '/home' },
    } as WalkerOS.Event;

    // Step 1: Resolve and run before chain
    const before = destination.config.before;
    let processedEvent: WalkerOS.Event = inputEvent;
    if (before && collector.transformers) {
      const beforeChainIds = walkChain(
        before as string | string[],
        extractTransformerNextMap(collector.transformers),
      );
      expect(beforeChainIds).toEqual(['enrich']);

      const beforeResult = await runTransformerChain(
        collector,
        collector.transformers,
        beforeChainIds,
        processedEvent,
        ingest,
        undefined,
        `destination.${destId}.before`,
      );

      expect(beforeResult).not.toBeNull();
      processedEvent = (
        Array.isArray(beforeResult) ? beforeResult![0] : beforeResult
      ) as WalkerOS.Event;
    }

    // Verify enrichment was applied
    expect(processedEvent.data).toEqual({ url: '/home', enriched: true });

    // Step 2: Initialize and push directly
    const isInitialized = await destinationInit(collector, destination, destId);
    expect(isInitialized).toBe(true);

    const pushResult = await destinationPush(
      collector,
      destination,
      destId,
      processedEvent,
      ingest,
    );

    // Mock interception returns the mock value
    expect(pushResult).toEqual({});

    // Before chain enriched the event before destination received it
    expect(enrichPush).toHaveBeenCalledTimes(1);

    // collector.push was NOT called
    expect(collector.push).not.toHaveBeenCalled();
  });

  it('returns early when before chain drops the event', async () => {
    // "gate" transformer drops the event
    const gatePush = jest.fn(async () => false as const);
    const gateTransformer = createTransformer(gatePush);

    const destPushFn = jest.fn(async () => ({ sent: true }));
    const destination = createDestination(destPushFn, {
      mock: {},
      before: 'gate',
    });

    const transformers: Transformer.Transformers = {
      gate: gateTransformer,
    };
    const collector = createMockCollector(transformers, {
      ga4: destination,
    });
    const destId = 'ga4';
    const ingest = createIngest(destId);

    const inputEvent = {
      name: 'page view',
      data: { url: '/home' },
    } as WalkerOS.Event;

    // Resolve and run before chain
    const before = destination.config.before;
    const beforeChainIds = walkChain(
      before as string | string[],
      extractTransformerNextMap(collector.transformers!),
    );
    expect(beforeChainIds).toEqual(['gate']);

    const beforeResult = await runTransformerChain(
      collector,
      collector.transformers!,
      beforeChainIds,
      inputEvent,
      ingest,
      undefined,
      `destination.${destId}.before`,
    );

    // Before chain dropped the event
    expect(beforeResult).toBeNull();

    // destinationPush should NOT be called when before chain drops
    expect(destPushFn).not.toHaveBeenCalled();

    // collector.push should NOT be called
    expect(collector.push).not.toHaveBeenCalled();
  });

  it('handles destination without before chain', async () => {
    const destPushFn = jest.fn(async () => ({ sent: true }));
    const destination = createDestination(destPushFn, { mock: {} });

    const collector = createMockCollector({}, { ga4: destination });
    const destId = 'ga4';
    const ingest = createIngest(destId);

    const inputEvent = {
      name: 'product add',
      data: { id: '42', price: 29.99 },
    } as WalkerOS.Event;

    // No before chain — skip straight to init + push
    const before = destination.config.before;
    expect(before).toBeUndefined();

    const isInitialized = await destinationInit(collector, destination, destId);
    expect(isInitialized).toBe(true);

    const pushResult = await destinationPush(
      collector,
      destination,
      destId,
      inputEvent,
      ingest,
    );

    // Mock interception returns mock value
    expect(pushResult).toEqual({});

    // collector.push was NOT called
    expect(collector.push).not.toHaveBeenCalled();
  });
});
