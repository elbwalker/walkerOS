import { applyStepPackages } from '../step-packages';
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
