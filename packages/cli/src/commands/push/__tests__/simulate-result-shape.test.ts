import type { Flow, WalkerOS } from '@walkeros/core';
import {
  simulateSource,
  simulateTransformer,
  simulateDestination,
} from '../index';
import { buildSimulationResult } from '../simulation-result';

/**
 * Shape contract for the three simulate functions: each returns a core
 * `Simulation.Result` ({ step, name, events, calls, duration, error? }).
 *
 * The error paths run the real functions end-to-end without needing a built
 * bundle (they fail before any bundle is loaded), so they directly prove the
 * return-type contract. The transformer's captured→events mapping (the
 * load-bearing part of Task 1.3) is asserted through `buildSimulationResult`
 * with the exact output-only captured entries the function now produces.
 */

const validEvent: WalkerOS.DeepPartialEvent = {
  name: 'order complete',
  entity: 'order',
  action: 'complete',
};

// Config object missing the source's `package` → simulateSource throws inside
// the try block and maps the error into a `Simulation.Result`.
const sourceConfigNoPackage: Flow.Json = {
  version: 4,
  flows: {
    default: {
      config: { platform: 'web' },
      sources: { browser: { config: {} } },
    },
  },
};

describe('simulate functions return Simulation.Result', () => {
  it('simulateSource error path returns a source-shaped result', async () => {
    const result = await simulateSource(
      sourceConfigNoPackage,
      {},
      { sourceId: 'browser', silent: true },
    );

    expect(result.step).toBe('source');
    expect(result.name).toBe('browser');
    expect(result.events).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(typeof result.duration).toBe('number');
    expect(result.error).toBeInstanceOf(Error);
  });

  it('simulateTransformer invalid-event path returns a transformer-shaped result', async () => {
    const result = await simulateTransformer(
      { version: 4, flows: {} },
      // Invalid: `user.email` must be a valid email → Zod rejects before
      // bundling. This is a valid `DeepPartialEvent` type but fails the
      // runtime schema, exercising the early-return error path.
      { user: { email: 'not-an-email' } },
      { transformerId: 'redact', silent: true },
    );

    expect(result.step).toBe('transformer');
    expect(result.name).toBe('redact');
    expect(result.events).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(typeof result.duration).toBe('number');
    expect(result.error).toBeInstanceOf(Error);
  });

  it('simulateDestination invalid-event path returns a destination-shaped result', async () => {
    const result = await simulateDestination(
      { version: 4, flows: {} },
      { user: { email: 'not-an-email' } },
      { destinationId: 'gtag', silent: true },
    );

    expect(result.step).toBe('destination');
    expect(result.name).toBe('gtag');
    expect(result.events).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(typeof result.duration).toBe('number');
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('transformer captured→events mapping (output-only convention)', () => {
  it('passthrough: a single output event maps to events:[<event>]', () => {
    const result = buildSimulationResult({
      step: 'transformer',
      name: 'enrich',
      startTime: Date.now(),
      captured: [{ event: validEvent, timestamp: 0 }],
    });

    expect(result.step).toBe('transformer');
    expect(result.events).toEqual([validEvent]);
    expect(result.calls).toEqual([]);
  });

  it('drop: a null output entry maps to events:[]', () => {
    const result = buildSimulationResult({
      step: 'transformer',
      name: 'drop',
      startTime: Date.now(),
      captured: [{ event: null, timestamp: 0 }],
    });

    expect(result.step).toBe('transformer');
    expect(result.events).toEqual([]);
    expect(result.calls).toEqual([]);
  });
});
