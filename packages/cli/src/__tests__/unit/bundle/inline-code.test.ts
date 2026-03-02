import { describe, it, expect } from '@jest/globals';
import {
  buildConfigObject,
  generatePlatformWrapper,
} from '../../../commands/bundle/bundler.js';
import type { Flow } from '@walkeros/core';

describe('Validation', () => {
  it('should error when both package and code are specified', () => {
    const flowConfig: Flow.Config = {
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
    expect(() => buildConfigObject(flowConfig, explicitCodeImports)).toThrow(
      /both package and code/i,
    );
  });

  it('should error when neither package nor code are specified', () => {
    const flowConfig: Flow.Config = {
      server: {},
      transformers: {
        invalid: {
          config: {},
        },
      },
    };

    const explicitCodeImports = new Map<string, Set<string>>();
    expect(() => buildConfigObject(flowConfig, explicitCodeImports)).toThrow(
      /package or code/i,
    );
  });
});

describe('Inline Code Bundling', () => {
  describe('Transformer with code object', () => {
    it('should generate inline transformer from code object', () => {
      const flowConfig: Flow.Config = {
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

      // buildConfigObject takes flowConfig and explicitCodeImports map
      const explicitCodeImports = new Map<string, Set<string>>();
      const result = buildConfigObject(flowConfig, explicitCodeImports);

      // Should contain the inline transformer
      expect(result).toContain('enrich');
      expect(result).toContain('enricher');
      expect(result).toContain('enriched: true');
      // Should NOT have package import reference (since there's no package)
      expect(result).not.toContain('@walkeros/transformer');
    });

    it('should handle inline transformer with init function', () => {
      const flowConfig: Flow.Config = {
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
      const result = buildConfigObject(flowConfig, explicitCodeImports);

      // Should contain the inline transformer with init
      expect(result).toContain('validator');
      expect(result).toContain('init');
      expect(result).toContain('push');
    });
  });

  describe('Source with code object', () => {
    it('should generate inline source from code object', () => {
      const flowConfig: Flow.Config = {
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
      const result = buildConfigObject(flowConfig, explicitCodeImports);

      // Should contain the inline source
      expect(result).toContain('customSource');
      expect(result).toContain('logger');
    });
  });

  describe('Destination with code object', () => {
    it('should generate inline destination from code object', () => {
      const flowConfig: Flow.Config = {
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
      const result = buildConfigObject(flowConfig, explicitCodeImports);

      // Should contain the inline destination
      expect(result).toContain('customDest');
      expect(result).toContain('logger');
    });
  });
});

describe('Integration', () => {
  it('should bundle mixed package and inline definitions', () => {
    const flowConfig: Flow.Config = {
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
    const result = buildConfigObject(flowConfig, explicitCodeImports);

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
  it('should include port override logic in server wrapper', () => {
    const configObject = `{
      sources: { http: { code: expressSource, config: { settings: { port: 3000 } } } },
      destinations: {}
    }`;

    const result = generatePlatformWrapper(configObject, '', {
      platform: 'server',
    });

    // Must contain port override block
    expect(result).toContain('context.port');
    expect(result).toContain('config.sources');
    // Must still contain logger override
    expect(result).toContain('context.logger');
    // Must export default function
    expect(result).toContain('export default async function');
  });

  it('should not include port override in browser wrapper', () => {
    const configObject = `{ sources: {}, destinations: {} }`;

    const result = generatePlatformWrapper(configObject, '', {
      platform: 'browser',
    });

    expect(result).not.toContain('context.port');
  });

  it('should generate port override that patches sources with existing port settings', () => {
    const configObject = `{
      sources: {
        http: { code: expressSource, config: { settings: { port: 3000 } } },
        other: { code: otherSource, config: { settings: { name: "test" } } }
      },
      destinations: {}
    }`;

    const result = generatePlatformWrapper(configObject, '', {
      platform: 'server',
    });

    // The generated code should only patch sources that already have a port setting
    expect(result).toContain('src.config.settings.port !== undefined');
    expect(result).toContain('src.config.settings.port = context.port');
  });
});
