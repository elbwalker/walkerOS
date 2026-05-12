import { autoInjectValidators } from '../validate-inject';
import type { Flow } from '../types';

describe('autoInjectValidators', () => {
  it('returns the flow unchanged when no validate fields are present', () => {
    const flow: Flow = {
      config: { platform: 'web' },
      sources: { browser: { package: '@walkeros/web-source-browser' } },
      destinations: { gtag: { package: '@walkeros/web-destination-gtag' } },
    };
    const result = autoInjectValidators(flow);
    expect(result).toEqual(flow);
  });

  it('appends to destination.before when destination.validate is set', () => {
    const flow: Flow = {
      config: { platform: 'web' },
      destinations: {
        ga4: {
          package: '@walkeros/web-destination-gtag-ga4',
          validate: { format: true, events: { order: { complete: {} } } },
        },
      },
    };
    const result = autoInjectValidators(flow);
    expect(result.transformers).toHaveProperty('__validate_destination_ga4');
    expect(result.transformers!['__validate_destination_ga4']).toMatchObject({
      package: '@walkeros/transformer-validator',
      config: {
        settings: { format: true, events: { order: { complete: {} } } },
      },
    });
    expect(result.destinations!.ga4.before).toBe('__validate_destination_ga4');
    expect(result.destinations!.ga4.validate).toBeUndefined();
  });

  it('prepends to source.next when source.validate is set', () => {
    const flow: Flow = {
      config: { platform: 'server' },
      sources: {
        http: {
          package: '@walkeros/server-source-express',
          validate: { schema: { type: 'object' } },
        },
      },
    };
    const result = autoInjectValidators(flow);
    expect(result.sources!.http.next).toBe('__validate_source_http');
    expect(result.transformers).toHaveProperty('__validate_source_http');
  });

  it('appends to existing destination.before chain (string)', () => {
    const flow: Flow = {
      config: { platform: 'web' },
      destinations: {
        ga4: {
          package: '@walkeros/web-destination-gtag-ga4',
          before: 'redact',
          validate: { format: true },
        },
      },
      transformers: { redact: { package: '@walkeros/transformer-redact' } },
    };
    const result = autoInjectValidators(flow);
    expect(result.destinations!.ga4.before).toEqual([
      'redact',
      '__validate_destination_ga4',
    ]);
  });

  it('appends to existing destination.before chain (array)', () => {
    const flow: Flow = {
      config: { platform: 'web' },
      destinations: {
        ga4: {
          package: '@walkeros/web-destination-gtag-ga4',
          before: ['redact', 'enrich'],
          validate: { format: true },
        },
      },
    };
    const result = autoInjectValidators(flow);
    expect(result.destinations!.ga4.before).toEqual([
      'redact',
      'enrich',
      '__validate_destination_ga4',
    ]);
  });

  it('adds @walkeros/transformer-validator to bundle.packages once', () => {
    const flow: Flow = {
      config: { platform: 'web', bundle: { packages: {} } },
      destinations: {
        a: {
          package: '@walkeros/web-destination-gtag',
          validate: { format: true },
        },
        b: {
          package: '@walkeros/web-destination-meta',
          validate: { format: true },
        },
      },
    };
    const result = autoInjectValidators(flow);
    expect(result.config!.bundle!.packages).toHaveProperty(
      '@walkeros/transformer-validator',
    );
  });

  it('throws if a user-supplied transformer name collides with the reserved prefix', () => {
    const flow: Flow = {
      config: { platform: 'web' },
      transformers: {
        __validate_destination_ga4: {
          package: '@walkeros/transformer-noop',
        },
      },
      destinations: {
        ga4: {
          package: '@walkeros/web-destination-gtag-ga4',
          validate: { format: true },
        },
      },
    };
    expect(() => autoInjectValidators(flow)).toThrow(/reserved/i);
  });
});
