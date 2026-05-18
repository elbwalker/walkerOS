import { describe, it, expect } from '@jest/globals';
import { buildSplitConfigObject } from '../../../commands/bundle/bundler.js';
import type { Flow } from '@walkeros/core';

describe('Validation', () => {
  it('should error when both package and code are specified', () => {
    const flowSettings: Flow = {
      config: { platform: 'server' },
      transformers: {
        invalid: {
          package: '@walkeros/transformer-fingerprint',
          code: {
            type: 'inline',
            push: '$code:(e) => e',
          },
        },
      },
    };

    const explicitCodeImports = new Map<string, Set<string>>();
    expect(() =>
      buildSplitConfigObject(flowSettings, explicitCodeImports),
    ).toThrow(/both .*code.* and .*package/i);
  });

  it('accepts a transformer entry with neither package nor code (pass-through)', () => {
    // Pass-through is the default for transformer steps. An entry with no
    // operative field is a no-op step. The bundler must accept it.
    const flowSettings: Flow = {
      config: { platform: 'server' },
      transformers: {
        passthrough: {
          config: {},
        },
      },
    };

    const explicitCodeImports = new Map<string, Set<string>>();
    expect(() =>
      buildSplitConfigObject(flowSettings, explicitCodeImports),
    ).not.toThrow();
  });
});

describe('Inline Code Bundling', () => {
  describe('Transformer with code object', () => {
    it('should generate inline transformer from code object', () => {
      const flowSettings: Flow = {
        config: { platform: 'server' },
        transformers: {
          enrich: {
            code: {
              type: 'enricher',
              push: '$code:(event) => ({ ...event, data: { ...event.data, enriched: true } })',
            },
            config: {},
          },
        },
      };

      // buildSplitConfigObject takes flowSettings and explicitCodeImports map
      const explicitCodeImports = new Map<string, Set<string>>();
      const { codeConfigObject: result } = buildSplitConfigObject(
        flowSettings,
        explicitCodeImports,
      );

      // Should contain the inline transformer
      expect(result).toContain('enrich');
      expect(result).toContain('enricher');
      expect(result).toContain('enriched: true');
      // Should NOT have package import reference (since there's no package)
      expect(result).not.toContain('@walkeros/transformer');
    });

    it('should handle inline transformer with init function', () => {
      const flowSettings: Flow = {
        config: { platform: 'server' },
        transformers: {
          validator: {
            code: {
              type: 'validator',
              push: '$code:(event) => event.data?.valid ? event : null',
              init: '$code:() => console.log("transformer initialized")',
            },
            config: { strict: true },
          },
        },
      };

      const explicitCodeImports = new Map<string, Set<string>>();
      const { codeConfigObject: result } = buildSplitConfigObject(
        flowSettings,
        explicitCodeImports,
      );

      // Should contain the inline transformer with init
      expect(result).toContain('validator');
      expect(result).toContain('init');
      expect(result).toContain('push');
    });
  });

  describe('Source with code object', () => {
    it('should generate inline source from code object', () => {
      const flowSettings: Flow = {
        config: { platform: 'server' },
        sources: {
          customSource: {
            code: {
              type: 'logger',
              push: '$code:(event) => console.log("Event:", event.name)',
            },
            config: {},
          },
        },
        destinations: {},
      };

      const explicitCodeImports = new Map<string, Set<string>>();
      const { codeConfigObject: result } = buildSplitConfigObject(
        flowSettings,
        explicitCodeImports,
      );

      // Should contain the inline source
      expect(result).toContain('customSource');
      expect(result).toContain('logger');
    });
  });

  describe('Destination with code object', () => {
    it('should generate inline destination from code object', () => {
      const flowSettings: Flow = {
        config: { platform: 'server' },
        sources: {},
        destinations: {
          customDest: {
            code: {
              type: 'logger',
              push: '$code:(event) => console.log("Sending:", event)',
            },
            config: {},
          },
        },
      };

      const explicitCodeImports = new Map<string, Set<string>>();
      const { codeConfigObject: result } = buildSplitConfigObject(
        flowSettings,
        explicitCodeImports,
      );

      // Should contain the inline destination
      expect(result).toContain('customDest');
      expect(result).toContain('logger');
    });
  });
});

describe('Integration', () => {
  it('should bundle mixed package and inline definitions', () => {
    const flowSettings: Flow = {
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/collector': { imports: ['startFlow'] },
            '@walkeros/transformer-fingerprint': {
              imports: ['transformerFingerprint'],
            },
          },
        },
      },
      sources: {
        manual: {
          code: {
            type: 'manual',
            push: '$code:context.env.elb',
          },
          config: {},
        },
      },
      transformers: {
        fingerprint: {
          package: '@walkeros/transformer-fingerprint',
        },
        enrich: {
          code: {
            type: 'enricher',
            push: '$code:(event) => ({ ...event, data: { ...event.data, enriched: true } })',
          },
          next: 'fingerprint',
          config: {},
        },
      },
      destinations: {
        logger: {
          code: {
            type: 'console',
            push: '$code:(event, ctx) => ctx.logger.info(event)',
          },
          config: {},
        },
      },
    };

    const explicitCodeImports = new Map<string, Set<string>>();
    const { codeConfigObject: result } = buildSplitConfigObject(
      flowSettings,
      explicitCodeImports,
    );

    // Package-based transformer should reference the import variable
    expect(result).toContain('fingerprint');
    expect(result).toContain('_walkerosTransformerFingerprint');

    // Inline code should be present
    expect(result).toContain('manual');
    expect(result).toContain('enricher');
    expect(result).toContain('console');
    expect(result).toContain('enriched: true');

    // Transformer chaining should be preserved
    expect(result).toContain('next');
  });
});
