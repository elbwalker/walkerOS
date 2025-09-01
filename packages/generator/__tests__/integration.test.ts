import { generateWalkerOSBundle } from '../src/index';
import type { GeneratorInput } from '../src/types';
import type { Flow } from '@walkeros/core';

describe('WalkerOS Generator Integration', () => {
  const simpleFlowConfig: Flow.Config = {
    packages: [
      { name: '@walkeros/core', version: '0.0.8', type: 'core' },
      { name: '@walkeros/collector', version: '0.0.8', type: 'collector' },
      {
        name: '@walkeros/web-source-browser',
        version: '0.0.9',
        type: 'source',
      },
      {
        name: '@walkeros/web-destination-gtag',
        version: '0.0.8',
        type: 'destination',
      },
    ],
    nodes: [
      {
        id: 'browser-source',
        type: 'source',
        package: '@walkeros/web-source-browser',
        config: {
          domain: 'example.com',
          autoTracking: true,
        },
      },
      {
        id: 'collector',
        type: 'collector',
        package: '@walkeros/collector',
        config: {
          consent: {
            functional: true,
            marketing: false,
          },
          queue: true,
        },
      },
      {
        id: 'gtag-destination',
        type: 'destination',
        package: '@walkeros/web-destination-gtag',
        config: {
          measurementId: 'G-XXXXXXXXXX',
        },
      },
    ],
    edges: [
      {
        id: 'browser-to-collector',
        source: 'browser-source',
        target: 'collector',
      },
      {
        id: 'collector-to-gtag',
        source: 'collector',
        target: 'gtag-destination',
      },
    ],
  };

  it('should generate a functional IIFE bundle from simple Flow config', async () => {
    const input: GeneratorInput = {
      flow: simpleFlowConfig,
    };

    const result = await generateWalkerOSBundle(input);

    // Verify basic structure
    expect(result).toHaveProperty('bundle');
    expect(typeof result.bundle).toBe('string');
    expect(result.bundle.length).toBeGreaterThan(0);

    // Verify IIFE wrapper (after comment block)
    expect(result.bundle).toContain('(function(window) {');
    expect(result.bundle).toMatch(/\}\)\(typeof window/);

    // Verify package comments are included
    expect(result.bundle).toContain('// @walkeros/core@0.0.8 (core)');
    expect(result.bundle).toContain('// @walkeros/collector@0.0.8 (collector)');
    expect(result.bundle).toContain(
      '// @walkeros/web-source-browser@0.0.9 (source)',
    );
    expect(result.bundle).toContain(
      '// @walkeros/web-destination-gtag@0.0.8 (destination)',
    );

    // Verify real package code is included (no TODO comments)
    expect(result.bundle).not.toContain('TODO: Replace with real');

    // Verify initialization code
    expect(result.bundle).toContain('async function initWalkerOS()');
    expect(result.bundle).toContain('window.walkerOS');
    expect(result.bundle).toContain('window.elb');

    // Verify collector configuration includes our nodes
    expect(result.bundle).toContain('browser-source');
    expect(result.bundle).toContain('gtag-destination');
    expect(result.bundle).toContain('G-XXXXXXXXXX');
  }, 30000); // 30 second timeout for real npm package resolution

  it('should validate Flow config structure', async () => {
    const invalidInput: GeneratorInput = {
      flow: {} as Flow.Config,
    };

    await expect(generateWalkerOSBundle(invalidInput)).rejects.toThrow();
  });

  it('should validate package configurations', async () => {
    const invalidPackageConfig: Flow.Config = {
      ...simpleFlowConfig,
      packages: [{ name: '', version: '1.0.0', type: 'core' }],
    };

    const input: GeneratorInput = {
      flow: invalidPackageConfig,
    };

    await expect(generateWalkerOSBundle(input)).rejects.toThrow();
  });

  it('should validate node configurations', async () => {
    const invalidNodeConfig: Flow.Config = {
      ...simpleFlowConfig,
      nodes: [{ id: '', type: 'source', package: '', config: {} }],
    };

    const input: GeneratorInput = {
      flow: invalidNodeConfig,
    };

    await expect(generateWalkerOSBundle(input)).rejects.toThrow();
  });

  it('should handle different package types correctly', async () => {
    const result = await generateWalkerOSBundle({ flow: simpleFlowConfig });

    // Verify package ordering (core -> collector -> source -> destination)
    const coreIndex = result.bundle.indexOf('// @walkeros/core@');
    const collectorIndex = result.bundle.indexOf('// @walkeros/collector@');
    const sourceIndex = result.bundle.indexOf(
      '// @walkeros/web-source-browser@',
    );
    const destinationIndex = result.bundle.indexOf(
      '// @walkeros/web-destination-gtag@',
    );

    expect(coreIndex).toBeLessThan(collectorIndex);
    expect(collectorIndex).toBeLessThan(sourceIndex);
    expect(sourceIndex).toBeLessThan(destinationIndex);
  }, 30000); // 30 second timeout for real npm package resolution

  it('should generate collector configuration from nodes', async () => {
    const result = await generateWalkerOSBundle({ flow: simpleFlowConfig });

    // Parse the generated collector config (this is a basic check)
    expect(result.bundle).toContain('"functional": true');
    expect(result.bundle).toContain('"marketing": false');
    expect(result.bundle).toContain('"queue": true');
  }, 30000); // 30 second timeout for real npm package resolution
});
