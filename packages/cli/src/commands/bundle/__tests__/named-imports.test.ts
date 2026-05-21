import { detectNamedImports } from '../bundler';
import type { Flow } from '@walkeros/core';

describe('detectNamedImports', () => {
  it('collects import names per package across all four step kinds', () => {
    const flow = {
      sources: {
        a: { package: '@walkeros/web-source-browser', import: 'sourceBrowser' },
      },
      transformers: {
        b: { package: '@walkeros/transformer-ga4', import: 'transformerGa4' },
      },
      destinations: {
        c: {
          package: '@walkeros/web-destination-gtag',
          import: 'destinationGtag',
        },
      },
      stores: {
        d: { package: '@walkeros/server-store-fs', import: 'storeFs' },
      },
    } as unknown as Flow;
    const map = detectNamedImports(flow);
    expect(map.get('@walkeros/web-source-browser')).toEqual(
      new Set(['sourceBrowser']),
    );
    expect(map.get('@walkeros/transformer-ga4')).toEqual(
      new Set(['transformerGa4']),
    );
    expect(map.get('@walkeros/web-destination-gtag')).toEqual(
      new Set(['destinationGtag']),
    );
    expect(map.get('@walkeros/server-store-fs')).toEqual(new Set(['storeFs']));
  });

  it('returns empty map when no import field is set', () => {
    const flow = {
      sources: { a: { package: '@walkeros/x' } },
    } as unknown as Flow;
    expect(detectNamedImports(flow).size).toBe(0);
  });

  it('collects multiple named imports from the same package', () => {
    const flow = {
      transformers: {
        a: { package: '@walkeros/transformer-x', import: 'foo' },
        b: { package: '@walkeros/transformer-x', import: 'bar' },
      },
    } as unknown as Flow;
    const map = detectNamedImports(flow);
    expect(map.get('@walkeros/transformer-x')).toEqual(new Set(['foo', 'bar']));
  });
});
