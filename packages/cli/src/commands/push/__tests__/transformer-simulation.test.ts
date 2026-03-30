import type { Flow } from '@walkeros/core';
import { buildOverrides } from '../overrides';

/**
 * Tests for transformer simulation wiring.
 *
 * executeTransformerSimulation is a private function that requires a real ESM
 * bundle to execute end-to-end. These tests verify the detection logic that
 * decides WHETHER to call it — the same check used in executeConfigPush.
 */
describe('transformer simulation wiring', () => {
  function findTransformerSimulateEntry(
    overrides: ReturnType<typeof buildOverrides>,
  ) {
    return overrides.transformers
      ? Object.entries(overrides.transformers).find(([, t]) => t.simulate)
      : undefined;
  }

  it('detects transformer simulate from --simulate transformer.redact', () => {
    const overrides = buildOverrides({ simulate: ['transformer.redact'] }, {
      server: {},
      transformers: { redact: {} },
    } as any);

    const entry = findTransformerSimulateEntry(overrides);
    expect(entry).toBeDefined();
    expect(entry![0]).toBe('redact');
    expect(entry![1].simulate).toBe(true);
  });

  it('returns undefined when no transformer simulate flag', () => {
    const overrides = buildOverrides({ simulate: ['destination.ga4'] }, {
      server: {},
      destinations: { ga4: {} },
      transformers: { redact: {} },
    } as any);

    const entry = findTransformerSimulateEntry(overrides);
    expect(entry).toBeUndefined();
  });

  it('returns undefined with empty overrides', () => {
    const overrides = buildOverrides({}, {
      server: {},
      transformers: { redact: {} },
    } as any);

    const entry = findTransformerSimulateEntry(overrides);
    expect(entry).toBeUndefined();
  });

  it('picks first transformer when multiple are simulated', () => {
    const overrides = buildOverrides(
      { simulate: ['transformer.redact', 'transformer.enrich'] },
      {
        server: {},
        transformers: { redact: {}, enrich: {} },
      } as any,
    );

    const entry = findTransformerSimulateEntry(overrides);
    expect(entry).toBeDefined();
    // First entry found
    expect(['redact', 'enrich']).toContain(entry![0]);
    expect(entry![1].simulate).toBe(true);
  });

  it('rejects source + transformer simulate combination', () => {
    expect(() =>
      buildOverrides({ simulate: ['source.express', 'transformer.redact'] }, {
        server: {},
        sources: { express: { package: '@walkeros/server-source-express' } },
        transformers: { redact: {} },
      } as any),
    ).toThrow('Cannot simulate both');
  });

  it('rejects destination + transformer simulate combination', () => {
    expect(() =>
      buildOverrides({ simulate: ['destination.ga4', 'transformer.redact'] }, {
        server: {},
        destinations: { ga4: {}, meta: {} },
        transformers: { redact: {} },
      } as any),
    ).toThrow('Cannot simulate both');
  });
});
