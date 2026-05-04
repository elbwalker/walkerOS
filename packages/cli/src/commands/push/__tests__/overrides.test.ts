import type { Flow } from '@walkeros/core';
import { buildOverrides } from '../overrides';

// Minimal Flow fixture with destinations
function makeFlowSettings(
  destinations: Record<string, { package?: string }> = {},
): Flow {
  return {
    config: { platform: 'web' },
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

    expect(result.destinations!.ga4).toEqual({ simulate: true });
  });

  it('simulate-implies-disabled: other destinations get disabled', () => {
    const result = buildOverrides(
      { simulate: ['destination.ga4'] },
      threeDestFlow,
    );

    expect(result.destinations!.ga4).toEqual({ simulate: true });
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

    expect(result.destinations!.ga4).toEqual({ simulate: true });
    expect(result.destinations!.meta).toEqual({ simulate: true });
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
      buildOverrides({ simulate: ['unknown.myT'] }, threeDestFlow),
    ).toThrow(
      'Unsupported step type: "unknown". Use "source", "destination", or "transformer"',
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
    expect(result.destinations!.ga4).toEqual({ simulate: true });
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

    expect(result.destinations!.ga4).toEqual({ simulate: true });
    expect(result.destinations!.meta).toEqual({
      config: { mock: { ok: true } },
    });
    expect(result.destinations!.bigquery).toEqual({
      config: { disabled: true },
    });
  });

  it('should parse --simulate source.express', () => {
    const result = buildOverrides({ simulate: ['source.express'] }, {
      config: { platform: 'server' },
      sources: { express: { package: '@walkeros/server-source-express' } },
      destinations: {},
    } as Flow);
    expect(result.sources).toEqual({ express: { simulate: true } });
    expect(result.destinations).toBeUndefined(); // no destination overrides
  });

  it('rejects mixed source and destination simulate', () => {
    expect(() =>
      buildOverrides({ simulate: ['source.express', 'destination.ga4'] }, {
        config: { platform: 'server' },
        sources: { express: {} },
        destinations: { ga4: {}, meta: {} },
      } as Flow),
    ).toThrow('Cannot simulate both');
  });

  it('should reject --mock on source', () => {
    expect(() =>
      buildOverrides({ mock: ['source.express={}'] }, {
        config: { platform: 'server' },
        sources: { express: {} },
      } as Flow),
    ).toThrow('--mock is not supported for sources');
  });

  it('should accept source. prefix in parseStep', () => {
    // Test via buildOverrides since parseStep is private
    const result = buildOverrides({ simulate: ['source.browser'] }, {
      config: { platform: 'web' },
      sources: { browser: {} },
      destinations: {},
    } as Flow);
    expect(result.sources).toEqual({ browser: { simulate: true } });
  });

  describe('transformer simulate', () => {
    it('parses --simulate transformer.redact', () => {
      const result = buildOverrides({ simulate: ['transformer.redact'] }, {
        config: { platform: 'server' },
        transformers: { redact: {} },
      } as any);
      expect(result.transformers).toEqual({ redact: { simulate: true } });
    });

    it('rejects mixed transformer + destination simulate', () => {
      expect(() =>
        buildOverrides(
          { simulate: ['transformer.redact', 'destination.ga4'] },
          {
            config: { platform: 'server' },
            destinations: { ga4: {}, meta: {} },
            transformers: { redact: {} },
          } as any,
        ),
      ).toThrow('Cannot simulate both');
    });

    it('rejects --mock transformer.X without chain path', () => {
      expect(() =>
        buildOverrides({ mock: ['transformer.redact={}'] }, {
          config: { platform: 'server' },
          transformers: { redact: {} },
        } as any),
      ).toThrow('Use --mock destination');
    });

    it('transformer simulate does not affect destination disabled logic', () => {
      const result = buildOverrides({ simulate: ['transformer.redact'] }, {
        config: { platform: 'server' },
        destinations: { ga4: {} },
        transformers: { redact: {} },
      } as any);
      expect(result.transformers).toEqual({ redact: { simulate: true } });
      expect(result.destinations).toBeUndefined();
    });
  });

  describe('path-specific mocks', () => {
    it('parses --mock destination.ga4.before.redact=value', () => {
      const result = buildOverrides(
        { mock: ['destination.ga4.before.redact={"name":"mocked"}'] },
        {
          config: { platform: 'web' },
          destinations: { ga4: {} },
          transformers: { redact: {} },
        } as any,
      );
      expect(result.transformerMocks).toEqual({
        'destination.ga4.before': { redact: { name: 'mocked' } },
      });
    });

    it('supports both global and path-specific mocks', () => {
      const result = buildOverrides(
        {
          mock: [
            'destination.ga4={}',
            'destination.piwik.before.redact={"x":1}',
          ],
        },
        {
          config: { platform: 'web' },
          destinations: { ga4: {}, piwik: {} },
          transformers: { redact: {} },
        } as any,
      );
      expect(result.destinations!.ga4.config!.mock).toEqual({});
      expect(result.transformerMocks).toEqual({
        'destination.piwik.before': { redact: { x: 1 } },
      });
    });

    it('rejects invalid chain type in path', () => {
      expect(() =>
        buildOverrides({ mock: ['destination.ga4.invalid.redact={}'] }, {
          config: { platform: 'web' },
          destinations: { ga4: {} },
        } as any),
      ).toThrow('Invalid chain type');
    });

    it('rejects 3-part path without transformer', () => {
      expect(() =>
        buildOverrides({ mock: ['destination.ga4.before={}'] }, {
          config: { platform: 'web' },
          destinations: { ga4: {} },
        } as any),
      ).toThrow('Specify a transformer');
    });

    it('path-specific mock does not disable other destinations', () => {
      const result = buildOverrides(
        { mock: ['destination.ga4.before.redact={}'] },
        {
          config: { platform: 'web' },
          destinations: { ga4: {}, piwik: {} },
          transformers: { redact: {} },
        } as any,
      );
      // No destination-level overrides — only transformer mocks
      expect(result.destinations).toBeUndefined();
      expect(result.transformerMocks).toBeDefined();
    });
  });
});
