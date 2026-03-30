import type { Flow } from '@walkeros/core';
import { buildOverrides } from '../overrides';

// Minimal Flow.Settings fixture with destinations
function makeFlowSettings(
  destinations: Record<string, { package?: string }> = {},
): Flow.Settings {
  return {
    web: {},
    destinations: Object.fromEntries(
      Object.entries(destinations).map(([name, dest]) => [
        name,
        { package: dest.package ?? `@walkeros/web-destination-${name}` },
      ]),
    ),
  };
}

describe('buildOverrides', () => {
  const threeDestFlow = makeFlowSettings({
    ga4: {},
    meta: {},
    bigquery: {},
  });

  it('returns empty object when no flags are provided', () => {
    const result = buildOverrides({}, threeDestFlow);
    expect(result).toEqual({});
  });

  it('returns empty object when flags are empty arrays', () => {
    const result = buildOverrides({ simulate: [], mock: [] }, threeDestFlow);
    expect(result).toEqual({});
  });

  it('single --simulate destination.ga4 produces correct override', () => {
    const result = buildOverrides(
      { simulate: ['destination.ga4'] },
      threeDestFlow,
    );

    expect(result.destinations!.ga4).toEqual({ config: { mock: {} } });
  });

  it('simulate-implies-disabled: other destinations get disabled', () => {
    const result = buildOverrides(
      { simulate: ['destination.ga4'] },
      threeDestFlow,
    );

    expect(result.destinations!.ga4).toEqual({ config: { mock: {} } });
    expect(result.destinations!.meta).toEqual({ config: { disabled: true } });
    expect(result.destinations!.bigquery).toEqual({
      config: { disabled: true },
    });
  });

  it('multiple --simulate flags keep multiple destinations active', () => {
    const result = buildOverrides(
      { simulate: ['destination.ga4', 'destination.meta'] },
      threeDestFlow,
    );

    expect(result.destinations!.ga4).toEqual({ config: { mock: {} } });
    expect(result.destinations!.meta).toEqual({ config: { mock: {} } });
    expect(result.destinations!.bigquery).toEqual({
      config: { disabled: true },
    });
  });

  it('--mock destination.ga4=JSON parses JSON value', () => {
    const result = buildOverrides(
      { mock: ['destination.ga4={"status":200}'] },
      threeDestFlow,
    );

    expect(result.destinations!.ga4).toEqual({
      config: { mock: { status: 200 } },
    });
    expect(result.destinations!.meta).toEqual({ config: { disabled: true } });
    expect(result.destinations!.bigquery).toEqual({
      config: { disabled: true },
    });
  });

  it('--mock with non-JSON value uses raw string', () => {
    const result = buildOverrides(
      { mock: ['destination.ga4=ok'] },
      threeDestFlow,
    );

    expect(result.destinations!.ga4).toEqual({
      config: { mock: 'ok' },
    });
  });

  it('--mock with numeric value parses as number', () => {
    const result = buildOverrides(
      { mock: ['destination.ga4=42'] },
      threeDestFlow,
    );

    expect(result.destinations!.ga4).toEqual({
      config: { mock: 42 },
    });
  });

  it('same destination in both simulate and mock throws', () => {
    expect(() =>
      buildOverrides(
        {
          simulate: ['destination.ga4'],
          mock: ['destination.ga4={"status":200}'],
        },
        threeDestFlow,
      ),
    ).toThrow('Destination "ga4" cannot be in both --simulate and --mock');
  });

  it('invalid step format without dot throws', () => {
    expect(() => buildOverrides({ simulate: ['ga4'] }, threeDestFlow)).toThrow(
      'Invalid step format: "ga4". Expected "source.NAME" or "destination.NAME"',
    );
  });

  it('unsupported step type throws', () => {
    expect(() =>
      buildOverrides({ simulate: ['transformer.myT'] }, threeDestFlow),
    ).toThrow(
      'Unsupported step type: "transformer". Use "source" or "destination"',
    );
  });

  it('--mock without = sign throws', () => {
    expect(() =>
      buildOverrides({ mock: ['destination.ga4'] }, threeDestFlow),
    ).toThrow(
      'Invalid --mock format: "destination.ga4". Expected destination.NAME=VALUE',
    );
  });

  it('destination. with empty name throws', () => {
    expect(() =>
      buildOverrides({ simulate: ['destination.'] }, threeDestFlow),
    ).toThrow('Missing name after "destination."');
  });

  it('handles flow with no destinations', () => {
    const emptyFlow = makeFlowSettings({});
    const result = buildOverrides({ simulate: ['destination.ga4'] }, emptyFlow);

    // ga4 gets simulate even though it's not in flow destinations
    expect(result.destinations!.ga4).toEqual({ config: { mock: {} } });
    // No other destinations to disable
    expect(Object.keys(result.destinations!)).toEqual(['ga4']);
  });

  it('mixed simulate and mock on different destinations', () => {
    const result = buildOverrides(
      {
        simulate: ['destination.ga4'],
        mock: ['destination.meta={"ok":true}'],
      },
      threeDestFlow,
    );

    expect(result.destinations!.ga4).toEqual({ config: { mock: {} } });
    expect(result.destinations!.meta).toEqual({
      config: { mock: { ok: true } },
    });
    expect(result.destinations!.bigquery).toEqual({
      config: { disabled: true },
    });
  });

  it('should parse --simulate source.express', () => {
    const result = buildOverrides(
      { simulate: ['source.express'] },
      {
        server: {},
        sources: { express: { package: '@walkeros/server-source-express' } },
        destinations: {},
      } as Flow.Settings,
    );
    expect(result.sources).toEqual({ express: { simulate: true } });
    expect(result.destinations).toBeUndefined(); // no destination overrides
  });

  it('should handle mixed source and destination simulate', () => {
    const result = buildOverrides(
      { simulate: ['source.express', 'destination.ga4'] },
      {
        server: {},
        sources: { express: {} },
        destinations: { ga4: {}, meta: {} },
      } as Flow.Settings,
    );
    expect(result.sources).toEqual({ express: { simulate: true } });
    expect(result.destinations!.ga4).toEqual({ config: { mock: {} } });
    expect(result.destinations!.meta).toEqual({ config: { disabled: true } });
  });

  it('should reject --mock on source', () => {
    expect(() =>
      buildOverrides(
        { mock: ['source.express={}'] },
        { server: {}, sources: { express: {} } } as Flow.Settings,
      ),
    ).toThrow('--mock is not supported for sources');
  });

  it('should accept source. prefix in parseStep', () => {
    // Test via buildOverrides since parseStep is private
    const result = buildOverrides(
      { simulate: ['source.browser'] },
      { web: {}, sources: { browser: {} }, destinations: {} } as Flow.Settings,
    );
    expect(result.sources).toEqual({ browser: { simulate: true } });
  });
});
