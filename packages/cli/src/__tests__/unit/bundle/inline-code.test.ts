import { describe, it, expect } from '@jest/globals';
import {
  buildSplitConfigObject,
  buildServerWrapper,
  buildWebWrapper,
  generateSplitWireConfigModule,
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
    expect(() =>
      buildSplitConfigObject(flowSettings, explicitCodeImports),
    ).toThrow(/both package and code/i);
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
    expect(() =>
      buildSplitConfigObject(flowSettings, explicitCodeImports),
    ).toThrow(/package or code/i);
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
    const { codeConfigObject: result } = buildSplitConfigObject(
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

describe('buildServerWrapper', () => {
  it('should include sourceSettings override in server wrapper', async () => {
    const esmCode = generateSplitWireConfigModule(
      'const stores = {};',
      '{ sources: { http: { code: expressSource, config: { settings: { port: 3000 } } } }, destinations: {} }',
      '',
    );

    const result = await buildServerWrapper(esmCode);

    // Must contain sourceSettings override block
    expect(result).toContain('context.sourceSettings');
    expect(result).toContain('config.sources');
    // Must export default function
    expect(result).toContain('export default async function');
  });

  it('should apply sourceSettings spread merge to sources', async () => {
    const esmCode = generateSplitWireConfigModule(
      'const stores = {};',
      '{}',
      '',
    );

    const result = await buildServerWrapper(esmCode);

    // The generated code should spread merge sourceSettings into source configs
    expect(result).toContain('context.sourceSettings');
    expect(result).toContain(
      '...src.config.settings, ...context.sourceSettings',
    );
  });

  it('applies logger from context', async () => {
    const esmCode = generateSplitWireConfigModule(
      'const stores = {};',
      '{}',
      '',
    );

    const result = await buildServerWrapper(esmCode);

    expect(result).toContain('context.logger');
    // Should NOT contain old manual logger spread merge
    expect(result).not.toContain('config.logger = { ...config.logger');
  });

  it('logger assignment comes before sourceSettings', async () => {
    const esmCode = generateSplitWireConfigModule(
      'const stores = {};',
      '{}',
      '',
    );

    const result = await buildServerWrapper(esmCode);

    const loggerIdx = result.indexOf('context.logger');
    const sourceSettingsIdx = result.indexOf('context.sourceSettings');
    expect(loggerIdx).toBeGreaterThan(-1);
    expect(sourceSettingsIdx).toBeGreaterThan(-1);
    expect(loggerIdx).toBeLessThan(sourceSettingsIdx);
  });
});

describe('buildWebWrapper', () => {
  it('should not include sourceSettings override in web wrapper', async () => {
    const esmCode = generateSplitWireConfigModule(
      'const stores = {};',
      '{ sources: {}, destinations: {} }',
      '',
    );

    const result = await buildWebWrapper(esmCode, {});

    expect(result).not.toContain('context.sourceSettings');
  });

  it('wraps code in async IIFE calling wireConfig', async () => {
    const esmCode = generateSplitWireConfigModule(
      'const stores = {};',
      '{ sources: {}, destinations: {} }',
      '',
    );

    const result = await buildWebWrapper(esmCode, {
      windowCollector: 'collector',
      windowElb: 'elb',
    });

    expect(result).toContain('(async () => {');
    expect(result).toContain('await startFlow(wireConfig(__configData))');
    expect(result).toContain("window['collector'] = collector");
    expect(result).toContain("window['elb'] = elb");
  });
});
