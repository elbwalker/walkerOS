import { applyStepPackages, resolveStepPackage } from '../step-packages';
import { createMockLogger } from '@walkeros/core';
import type { Flow } from '@walkeros/core';

describe('applyStepPackages path precedence', () => {
  const logger = createMockLogger();

  it('keeps a local path when steps declare conflicting inline versions', () => {
    const flow: Flow = {
      destinations: {
        a: { package: '@walkeros/dest@1.0.0' },
        b: { package: '@walkeros/dest@2.0.0' },
      },
    };
    const packages: Record<string, Flow.BundlePackage> = {
      '@walkeros/dest': { path: './pkgs/dest' },
    };

    applyStepPackages(flow, packages, logger);

    expect(packages['@walkeros/dest']).toEqual({ path: './pkgs/dest' });
  });

  it('does not stamp an inline version onto a path entry', () => {
    const flow: Flow = {
      destinations: { a: { package: '@walkeros/dest@1.0.0' } },
    };
    const packages: Record<string, Flow.BundlePackage> = {
      '@walkeros/dest': { path: './pkgs/dest' },
    };

    applyStepPackages(flow, packages, logger);

    expect(packages['@walkeros/dest']).toEqual({ path: './pkgs/dest' });
  });

  it('still throws on conflicting inline versions without a bundle entry', () => {
    const flow: Flow = {
      destinations: {
        a: { package: '@walkeros/dest@1.0.0' },
        b: { package: '@walkeros/dest@2.0.0' },
      },
    };

    expect(() => applyStepPackages(flow, {}, logger)).toThrow(
      /Conflicting inline versions/,
    );
  });

  it('still lets a version pin win over a disagreeing inline version', () => {
    const flow: Flow = {
      destinations: { a: { package: '@walkeros/dest@1.0.0' } },
    };
    const packages: Record<string, Flow.BundlePackage> = {
      '@walkeros/dest': { version: '2.0.0' },
    };

    applyStepPackages(flow, packages, logger);

    expect(packages['@walkeros/dest'].version).toBe('2.0.0');
  });

  it('still fills an unversioned bundle entry from the inline version', () => {
    const flow: Flow = {
      destinations: { a: { package: '@walkeros/dest@1.0.0' } },
    };
    const packages: Record<string, Flow.BundlePackage> = {
      '@walkeros/dest': {},
    };

    applyStepPackages(flow, packages, logger);

    expect(packages['@walkeros/dest'].version).toBe('1.0.0');
  });
});

function flowWith(overrides: Partial<Flow>): Flow {
  return { config: { platform: 'server' }, ...overrides };
}

describe('resolveStepPackage', () => {
  const logger = createMockLogger();

  it('returns the version pinned in config.bundle.packages', () => {
    const flow = flowWith({
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/server-destination-gcp': { version: '4.4.0' },
          },
        },
      },
      destinations: {
        bigquery: { package: '@walkeros/server-destination-gcp', config: {} },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'bigquery', logger);
    expect(result.packageName).toBe('@walkeros/server-destination-gcp');
    expect(result.spec.version).toBe('4.4.0');
  });

  it('uses an inline step version when no bundle pin exists', () => {
    const flow = flowWith({
      destinations: {
        bigquery: {
          package: '@walkeros/server-destination-gcp@4.3.0',
          config: {},
        },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'bigquery', logger);
    expect(result.packageName).toBe('@walkeros/server-destination-gcp');
    expect(result.spec.version).toBe('4.3.0');
  });

  it('prefers the bundle pin over a disagreeing inline version', () => {
    const flow = flowWith({
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/server-destination-gcp': { version: '4.4.0' },
          },
        },
      },
      destinations: {
        bigquery: {
          package: '@walkeros/server-destination-gcp@4.3.0',
          config: {},
        },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'bigquery', logger);
    expect(result.spec.version).toBe('4.4.0');
  });

  it('carries a path entry through', () => {
    const flow = flowWith({
      config: {
        platform: 'server',
        bundle: { packages: { 'my-dest': { path: './pkgs/my-dest' } } },
      },
      destinations: { d: { package: 'my-dest', config: {} } },
    });
    const result = resolveStepPackage(flow, 'destination', 'd', logger);
    expect(result.spec.path).toBe('./pkgs/my-dest');
  });

  it('does not mutate the input flow and rewrites the clone to bare names', () => {
    const flow = flowWith({
      destinations: {
        bigquery: {
          package: '@walkeros/server-destination-gcp@4.3.0',
          config: {},
        },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'bigquery', logger);
    expect(flow.destinations?.bigquery?.package).toBe(
      '@walkeros/server-destination-gcp@4.3.0',
    );
    expect(result.normalizedFlow.destinations?.bigquery?.package).toBe(
      '@walkeros/server-destination-gcp',
    );
  });

  it('surfaces overrides from config.bundle.overrides', () => {
    const flow = flowWith({
      config: {
        platform: 'server',
        bundle: { overrides: { '@amplitude/analytics-types': '2.11.1' } },
      },
      destinations: {
        d: { package: '@walkeros/web-destination-api', config: {} },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'd', logger);
    expect(result.overrides).toEqual({
      '@amplitude/analytics-types': '2.11.1',
    });
  });

  it('throws when the step does not exist', () => {
    expect(() =>
      resolveStepPackage(flowWith({}), 'destination', 'missing', logger),
    ).toThrow(/missing/);
  });

  it('throws when the step has inline code instead of a package', () => {
    const flow = flowWith({
      destinations: { d: { code: { push: '$code:() => {}' }, config: {} } },
    });
    expect(() => resolveStepPackage(flow, 'destination', 'd', logger)).toThrow(
      /package/,
    );
  });
});

describe('resolveStepPackage label and kind', () => {
  const logger = createMockLogger();

  it.each<
    [
      string,
      Flow,
      'transformer' | 'destination',
      string,
      string,
      Flow.BundlePackage,
    ]
  >([
    [
      "a step's own local path",
      flowWith({ destinations: { d: { package: './pkgs/x' } } }),
      'destination',
      'd',
      './pkgs/x',
      { path: './pkgs/x' },
    ],
    [
      'a bundle-pinned path',
      flowWith({
        config: {
          platform: 'server',
          bundle: { packages: { 'my-dest': { path: './pkgs/my-dest' } } },
        },
        destinations: { d: { package: 'my-dest' } },
      }),
      'destination',
      'd',
      'my-dest',
      { path: './pkgs/my-dest' },
    ],
    [
      'an inline version',
      flowWith({ destinations: { d: { package: '@walkeros/x@1.2.3' } } }),
      'destination',
      'd',
      '@walkeros/x',
      { version: '1.2.3' },
    ],
    [
      'a transformer step',
      flowWith({
        transformers: { t: { package: '@walkeros/transformer-ga4' } },
      }),
      'transformer',
      't',
      '@walkeros/transformer-ga4',
      {},
    ],
  ])('labels %s', (_case, flow, kind, id, label, spec) => {
    const result = resolveStepPackage(flow, kind, id, logger);
    expect(result.label).toBe(label);
    expect(result.spec).toEqual(spec);
  });
});
