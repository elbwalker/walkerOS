import {
  serializeWithCode,
  validateComponentNames,
  collectStepPackages,
} from '../bundler';
import type { Flow } from '@walkeros/core';

describe('serializeWithCode __WALKEROS_ENV marker', () => {
  it('emits process.env expression for marker-only string', () => {
    expect(serializeWithCode('__WALKEROS_ENV:API_KEY', 0)).toBe(
      'process.env["API_KEY"]',
    );
  });

  it('emits process.env with fallback for marker with default', () => {
    expect(serializeWithCode('__WALKEROS_ENV:HOST:localhost', 0)).toBe(
      'process.env["HOST"] ?? "localhost"',
    );
  });

  it('handles URL default value with embedded colons', () => {
    expect(
      serializeWithCode('__WALKEROS_ENV:REDIS_URL:redis://localhost:6379', 0),
    ).toBe('process.env["REDIS_URL"] ?? "redis://localhost:6379"');
  });

  it('emits template literal for mixed content', () => {
    expect(serializeWithCode('https://__WALKEROS_ENV:HOST/api', 0)).toBe(
      '`https://${process.env["HOST"]}/api`',
    );
  });

  it('handles multiple markers in one string', () => {
    // PROTO captures `//` as default (chars before next marker are part of default)
    expect(
      serializeWithCode('__WALKEROS_ENV:PROTO://__WALKEROS_ENV:HOST/path', 0),
    ).toBe('`${process.env["PROTO"] ?? "//"}${process.env["HOST"]}/path`');
  });

  it('handles marker embedded in longer string with default', () => {
    // Default extends to end of string (no next marker to stop at)
    expect(serializeWithCode('prefix-__WALKEROS_ENV:PORT:8080-suffix', 0)).toBe(
      '`prefix-${process.env["PORT"] ?? "8080-suffix"}`',
    );
  });

  it('escapes dollar signs in static parts of template literals', () => {
    expect(serializeWithCode('Price is $5 for __WALKEROS_ENV:ITEM', 0)).toBe(
      '`Price is \\$5 for ${process.env["ITEM"]}`',
    );
  });

  it('escapes backticks in static parts of template literals', () => {
    expect(serializeWithCode('say `hello` to __WALKEROS_ENV:NAME', 0)).toBe(
      '`say \\`hello\\` to ${process.env["NAME"]}`',
    );
  });

  it('does not consume next marker as default value', () => {
    // `-` before next marker is captured as part of A's default
    expect(
      serializeWithCode('__WALKEROS_ENV:A:fallback-__WALKEROS_ENV:B', 0),
    ).toBe('`${process.env["A"] ?? "fallback-"}${process.env["B"]}`');
  });

  it('still handles $code: prefix', () => {
    expect(serializeWithCode('$code:myFunction()', 0)).toBe('myFunction()');
  });

  it('still handles plain strings', () => {
    expect(serializeWithCode('hello', 0)).toBe('"hello"');
  });
});

describe('validateComponentNames', () => {
  it('should accept valid camelCase names', () => {
    expect(() =>
      validateComponentNames(
        {
          cache: {},
          router: {},
          gtagWrapper: {},
        },
        'transformers',
      ),
    ).not.toThrow();
  });

  it('should reject names with hyphens', () => {
    expect(() =>
      validateComponentNames(
        {
          'gtag-wrapper': {},
        },
        'transformers',
      ),
    ).toThrow(/gtag-wrapper.*valid JavaScript identifier/);
  });

  it('should reject names starting with numbers', () => {
    expect(() =>
      validateComponentNames(
        {
          '123abc': {},
        },
        'sources',
      ),
    ).toThrow(/123abc.*valid JavaScript identifier/);
  });

  it('should suggest camelCase alternative for hyphenated names', () => {
    expect(() =>
      validateComponentNames(
        {
          'my-cool-source': {},
        },
        'sources',
      ),
    ).toThrow(/myCoolSource/);
  });
});

describe('collectStepPackages', () => {
  it('returns empty set for flow with no steps', () => {
    const settings = {} as Flow.Settings;
    expect(collectStepPackages(settings)).toEqual(new Set());
  });

  it('collects source packages', () => {
    const settings = {
      sources: {
        http: { package: '@walkeros/server-source-express' },
      },
    } as unknown as Flow.Settings;
    expect(collectStepPackages(settings)).toEqual(
      new Set(['@walkeros/server-source-express']),
    );
  });

  it('collects destination packages', () => {
    const settings = {
      destinations: {
        bigquery: { package: '@walkeros/server-destination-bigquery' },
      },
    } as unknown as Flow.Settings;
    expect(collectStepPackages(settings)).toEqual(
      new Set(['@walkeros/server-destination-bigquery']),
    );
  });

  it('collects transformer packages', () => {
    const settings = {
      transformers: {
        cache: { package: '@walkeros/server-transformer-cache' },
      },
    } as unknown as Flow.Settings;
    expect(collectStepPackages(settings)).toEqual(
      new Set(['@walkeros/server-transformer-cache']),
    );
  });

  it('collects store packages', () => {
    const settings = {
      stores: {
        fs: { package: '@walkeros/server-store-fs' },
      },
    } as unknown as Flow.Settings;
    expect(collectStepPackages(settings)).toEqual(
      new Set(['@walkeros/server-store-fs']),
    );
  });

  it('collects from all step types combined', () => {
    const settings = {
      sources: { http: { package: '@walkeros/server-source-express' } },
      destinations: {
        bq: { package: '@walkeros/server-destination-bigquery' },
      },
      transformers: {
        cache: { package: '@walkeros/server-transformer-cache' },
      },
      stores: { fs: { package: '@walkeros/server-store-fs' } },
    } as unknown as Flow.Settings;
    const result = collectStepPackages(settings);
    expect(result.size).toBe(4);
    expect(result.has('@walkeros/server-source-express')).toBe(true);
    expect(result.has('@walkeros/server-destination-bigquery')).toBe(true);
    expect(result.has('@walkeros/server-transformer-cache')).toBe(true);
    expect(result.has('@walkeros/server-store-fs')).toBe(true);
  });

  it('skips steps with inline code instead of package', () => {
    const settings = {
      sources: {
        custom: { code: { push: 'myPush()' } },
      },
    } as unknown as Flow.Settings;
    expect(collectStepPackages(settings)).toEqual(new Set());
  });

  it('skips local paths (starting with . or /)', () => {
    const settings = {
      sources: {
        local1: { package: './my-source' },
        local2: { package: '/abs/path/source' },
      },
    } as unknown as Flow.Settings;
    expect(collectStepPackages(settings)).toEqual(new Set());
  });

  it('includes scoped npm packages (starting with @)', () => {
    const settings = {
      sources: {
        s: { package: '@walkeros/server-source-express' },
      },
    } as unknown as Flow.Settings;
    const result = collectStepPackages(settings);
    expect(result.has('@walkeros/server-source-express')).toBe(true);
  });

  it('includes unscoped npm packages', () => {
    const settings = {
      destinations: {
        d: { package: 'some-destination' },
      },
    } as unknown as Flow.Settings;
    const result = collectStepPackages(settings);
    expect(result.has('some-destination')).toBe(true);
  });

  it('deduplicates same package used in multiple steps', () => {
    const settings = {
      sources: { s1: { package: '@walkeros/core' } },
      destinations: { d1: { package: '@walkeros/core' } },
    } as unknown as Flow.Settings;
    const result = collectStepPackages(settings);
    expect(result.size).toBe(1);
  });
});

describe('collectStepPackages auto-add merge logic', () => {
  it('adds source package to buildOptions.packages when not present', () => {
    const flowSettings = {
      sources: { http: { package: '@walkeros/server-source-express' } },
    } as unknown as Flow.Settings;

    const packages: Record<string, Record<string, unknown>> = {};

    const stepPkgs = collectStepPackages(flowSettings);
    for (const pkg of stepPkgs) {
      if (!packages[pkg]) {
        packages[pkg] = {};
      }
    }

    expect(packages['@walkeros/server-source-express']).toEqual({});
  });

  it('does not overwrite existing package config', () => {
    const flowSettings = {
      sources: { http: { package: '@walkeros/server-source-express' } },
    } as unknown as Flow.Settings;

    const packages: Record<string, Record<string, unknown>> = {
      '@walkeros/server-source-express': { version: '2.0.0' },
    };

    const stepPkgs = collectStepPackages(flowSettings);
    for (const pkg of stepPkgs) {
      if (!packages[pkg]) {
        packages[pkg] = {};
      }
    }

    expect(packages['@walkeros/server-source-express']).toEqual({
      version: '2.0.0',
    });
  });
});
