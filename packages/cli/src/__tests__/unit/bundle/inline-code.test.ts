import { describe, it, expect } from '@jest/globals';
import {
  buildConfigObject,
  generatePlatformWrapper,
} from '../../../commands/bundle/bundler.js';
import type { Flow } from '@walkeros/core';

describe('Validation', () => {
  it('should error when both package and code are specified', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      transformers: {
        invalid: {
          package: '@walkeros/transformer-validator',
          code: {
            type: 'inline',
            push: '$code:(e) => e',
          },
        },
      },
    };

    const explicitCodeImports = new Map<string, Set<string>>();
    expect(() => buildConfigObject(flowSettings, explicitCodeImports)).toThrow(
      /both package and code/i,
    );
  });

  it('should error when neither package nor code are specified', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      transformers: {
        invalid: {
          config: {},
        },
      },
    };

    const explicitCodeImports = new Map<string, Set<string>>();
    expect(() => buildConfigObject(flowSettings, explicitCodeImports)).toThrow(
      /package or code/i,
    );
  });
});

describe('Inline Code Bundling', () => {
  describe('Transformer with code object', () => {
    it('should generate inline transformer from code object', () => {
      const flowSettings: Flow.Settings = {
        server: {},
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

      // buildConfigObject takes flowSettings and explicitCodeImports map
      const explicitCodeImports = new Map<string, Set<string>>();
      const { configObject: result } = buildConfigObject(
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
      const flowSettings: Flow.Settings = {
        server: {},
        transformers: {
          validator: {
            code: {
              type: 'validator',
              push: '$code:(event) => event.data?.valid ? event : null',
              init: '$code:() => console.log("Validator initialized")',
            },
            config: { strict: true },
          },
        },
      };

      const explicitCodeImports = new Map<string, Set<string>>();
      const { configObject: result } = buildConfigObject(
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
      const flowSettings: Flow.Settings = {
        server: {},
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
      const { configObject: result } = buildConfigObject(
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
      const flowSettings: Flow.Settings = {
        server: {},
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
      const { configObject: result } = buildConfigObject(
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
    const flowSettings: Flow.Settings = {
      server: {},
      packages: {
        '@walkeros/collector': { imports: ['startFlow'] },
        '@walkeros/transformer-validator': {
          imports: ['transformerValidator'],
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
        validate: {
          package: '@walkeros/transformer-validator',
        },
        enrich: {
          code: {
            type: 'enricher',
            push: '$code:(event) => ({ ...event, data: { ...event.data, enriched: true } })',
          },
          next: 'validate',
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
    const { configObject: result } = buildConfigObject(
      flowSettings,
      explicitCodeImports,
    );

    // Package-based transformer should reference the import variable
    expect(result).toContain('validate');
    expect(result).toContain('_walkerosTransformerValidator');

    // Inline code should be present
    expect(result).toContain('manual');
    expect(result).toContain('enricher');
    expect(result).toContain('console');
    expect(result).toContain('enriched: true');

    // Transformer chaining should be preserved
    expect(result).toContain('next');
  });
});

describe('generatePlatformWrapper', () => {
  it('should include source settings override in server wrapper', () => {
    const configObject = `{
      sources: { http: { code: expressSource, config: { settings: { port: 3000 } } } },
      destinations: {}
    }`;

    const result = generatePlatformWrapper(
      'const stores = {};',
      configObject,
      '',
      {
        platform: 'server',
      },
    );

    // Must contain sourceSettings override block
    expect(result).toContain('context.sourceSettings');
    expect(result).toContain('config.sources');
    // Must contain deepMerge for context overrides
    expect(result).toContain('deepMerge(config, context)');
    // Must export default function
    expect(result).toContain('export default async function');
  });

  it('should not include source settings override in browser wrapper', () => {
    const configObject = `{ sources: {}, destinations: {} }`;

    const result = generatePlatformWrapper(
      'const stores = {};',
      configObject,
      '',
      {
        platform: 'browser',
      },
    );

    expect(result).not.toContain('context.sourceSettings');
  });

  it('web wrapper accepts context parameter', () => {
    const configObject = `{ sources: {}, destinations: {} }`;

    const result = generatePlatformWrapper(
      'const stores = {};',
      configObject,
      '',
      {
        platform: 'browser',
      },
    );

    expect(result).toContain('(async (context)');
  });

  it('web wrapper reads window.__elbConfig', () => {
    const configObject = `{ sources: {}, destinations: {} }`;

    const result = generatePlatformWrapper(
      'const stores = {};',
      configObject,
      '',
      {
        platform: 'browser',
      },
    );

    expect(result).toContain('window.__elbConfig');
    expect(result).toContain("typeof window !== 'undefined'");
  });

  it('web wrapper uses deepMerge for context', () => {
    const configObject = `{ sources: {}, destinations: {} }`;

    const result = generatePlatformWrapper(
      'const stores = {};',
      configObject,
      '',
      {
        platform: 'browser',
      },
    );

    expect(result).toContain('deepMerge(config, context)');
  });

  it('server wrapper uses deepMerge instead of manual logger merge', () => {
    const configObject = `{ sources: {}, destinations: {} }`;

    const result = generatePlatformWrapper(
      'const stores = {};',
      configObject,
      '',
      {
        platform: 'server',
      },
    );

    expect(result).toContain('deepMerge(config, context)');
    // Should NOT contain old manual logger merge
    expect(result).not.toContain('config.logger = { ...config.logger');
  });

  it('server wrapper still has sourceSettings block after deepMerge', () => {
    const configObject = `{ sources: {}, destinations: {} }`;

    const result = generatePlatformWrapper(
      'const stores = {};',
      configObject,
      '',
      {
        platform: 'server',
      },
    );

    // deepMerge should come before sourceSettings
    const deepMergeIdx = result.indexOf('deepMerge(config, context)');
    const sourceSettingsIdx = result.indexOf('context.sourceSettings');
    expect(deepMergeIdx).toBeGreaterThan(-1);
    expect(sourceSettingsIdx).toBeGreaterThan(-1);
    expect(deepMergeIdx).toBeLessThan(sourceSettingsIdx);
  });

  it('should apply sourceSettings spread merge to sources', () => {
    const configObject = `{
      sources: {
        http: { code: expressSource, config: { settings: { port: 3000 } } },
        other: { code: otherSource, config: { settings: { name: "test" } } }
      },
      destinations: {}
    }`;

    const result = generatePlatformWrapper(
      'const stores = {};',
      configObject,
      '',
      {
        platform: 'server',
      },
    );

    // The generated code should spread merge sourceSettings into source configs
    expect(result).toContain('context.sourceSettings');
    expect(result).toContain(
      '...src.config.settings, ...context.sourceSettings',
    );
  });
});
