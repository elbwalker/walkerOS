import type { Flow } from '@walkeros/core';
import { findExample } from '../example-loader';

function makeConfig(overrides: Partial<Flow.Config> = {}): Flow.Config {
  return {
    web: {},
    ...overrides,
  } as Flow.Config;
}

describe('findExample', () => {
  const configWithExamples = makeConfig({
    destinations: {
      gtag: {
        package: '@walkeros/web-destination-gtag',
        examples: {
          purchase: {
            in: { name: 'order complete', data: { total: 42 } },
            out: [{ type: 'call', path: 'gtag', args: ['event', 'purchase'] }],
          },
          pageview: {
            in: { name: 'page view' },
            out: [{ type: 'call', path: 'gtag', args: ['event', 'page_view'] }],
          },
        },
      } as unknown as Flow.DestinationReference,
    },
    sources: {
      browser: {
        package: '@walkeros/web-source-browser',
        examples: {
          basic: {
            in: { name: 'page view' },
          },
        },
      } as unknown as Flow.SourceReference,
    },
    transformers: {
      enrich: {
        package: '@walkeros/transformer-enrich',
        examples: {
          purchase: {
            in: { name: 'order complete' },
            out: { name: 'order complete', data: { enriched: true } },
          },
        },
      } as unknown as Flow.TransformerReference,
    },
  });

  it('finds an unambiguous example across all steps', () => {
    const result = findExample(configWithExamples, 'pageview');
    expect(result).toEqual({
      stepType: 'destination',
      stepName: 'gtag',
      exampleName: 'pageview',
      example: {
        in: { name: 'page view' },
        out: [{ type: 'call', path: 'gtag', args: ['event', 'page_view'] }],
      },
    });
  });

  it('finds example with --step targeting specific step', () => {
    const result = findExample(
      configWithExamples,
      'purchase',
      'destination.gtag',
    );
    expect(result.stepType).toBe('destination');
    expect(result.stepName).toBe('gtag');
    expect(result.example.in).toEqual({
      name: 'order complete',
      data: { total: 42 },
    });
  });

  it('finds example in transformer with --step', () => {
    const result = findExample(
      configWithExamples,
      'purchase',
      'transformer.enrich',
    );
    expect(result.stepType).toBe('transformer');
    expect(result.stepName).toBe('enrich');
  });

  it('errors on nonexistent example', () => {
    expect(() => findExample(configWithExamples, 'nonexistent')).toThrow(
      'Example "nonexistent" not found in any step',
    );
  });

  it('errors on ambiguous example without --step', () => {
    expect(() => findExample(configWithExamples, 'purchase')).toThrow(
      /found in multiple steps/,
    );
    expect(() => findExample(configWithExamples, 'purchase')).toThrow(
      /Use --step to disambiguate/,
    );
  });

  it('errors on invalid --step format', () => {
    expect(() => findExample(configWithExamples, 'purchase', 'gtag')).toThrow(
      /Invalid --step format/,
    );
  });

  it('errors when step type has no entries', () => {
    const config = makeConfig({ sources: undefined });
    expect(() => findExample(config, 'test', 'source.browser')).toThrow(
      'No sources found',
    );
  });

  it('errors when named step does not exist', () => {
    expect(() =>
      findExample(configWithExamples, 'purchase', 'destination.meta'),
    ).toThrow(/destination "meta" not found/);
  });

  it('errors when example not found in targeted step', () => {
    expect(() =>
      findExample(configWithExamples, 'nonexistent', 'destination.gtag'),
    ).toThrow(/Example "nonexistent" not found in destination "gtag"/);
  });

  it('finds example in source', () => {
    const result = findExample(configWithExamples, 'basic');
    expect(result.stepType).toBe('source');
    expect(result.stepName).toBe('browser');
    expect(result.example.in).toEqual({ name: 'page view' });
  });
});
