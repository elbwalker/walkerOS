import {
  buildConfigObject,
  generatePlatformWrapper,
  createEntryPoint,
  detectTransformerPackages,
  detectExplicitCodeImports,
  serializeWithCode,
} from '../../../commands/bundle/bundler.js';
import { loadBundleConfig } from '../../../config/index.js';
import type { Flow } from '@walkeros/core';
import type { BuildOptions } from '../../../types/bundle.js';

describe('buildConfigObject', () => {
  it('uses explicit code for named imports', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {
        http: {
          package: '@walkeros/server-source-express',
          code: 'sourceExpress',
          config: { settings: { port: 8080 } },
        },
      },
      destinations: {
        demo: {
          package: '@walkeros/destination-demo',
          code: 'destinationDemo',
          config: { settings: { name: 'Test' } },
        },
      },
    };

    const explicitCodeImports = new Map([
      ['@walkeros/server-source-express', new Set(['sourceExpress'])],
      ['@walkeros/destination-demo', new Set(['destinationDemo'])],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    expect(result).toContain('code: sourceExpress');
    expect(result).toContain('code: destinationDemo');
    expect(result).toContain('"port": 8080');
    expect(result).toContain('"name": "Test"');
  });

  it('uses default import variable when no explicit code', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {
        http: {
          package: '@walkeros/server-source-express',
          config: { settings: { port: 8080 } },
        },
      },
      destinations: {},
    };

    const explicitCodeImports = new Map(); // No explicit imports

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    expect(result).toContain('code: _walkerosServerSourceExpress');
  });
});

describe('$code: prefix support', () => {
  it('outputs raw JavaScript for $code: prefixed values', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {
        http: {
          package: '@walkeros/server-source-express',
          code: 'sourceExpress',
          config: {
            settings: {
              transform: '$code:(value) => value.toUpperCase()',
            },
          },
        },
      },
      destinations: {},
    };

    const explicitCodeImports = new Map([
      ['@walkeros/server-source-express', new Set(['sourceExpress'])],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    // Should contain raw JS, not quoted string
    expect(result).toContain('"transform": (value) => value.toUpperCase()');
    // Should NOT contain the $code: prefix
    expect(result).not.toContain('$code:');
  });

  it('handles nested $code: values in objects', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {
        api: {
          package: '@walkeros/destination-demo',
          code: 'destinationDemo',
          config: {
            mapping: {
              product: {
                view: {
                  data: {
                    map: {
                      price: {
                        key: 'data.price',
                        fn: '$code:(v) => Math.round(v * 100)',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const explicitCodeImports = new Map([
      ['@walkeros/destination-demo', new Set(['destinationDemo'])],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    // Should contain raw JS function
    expect(result).toContain('"fn": (v) => Math.round(v * 100)');
    expect(result).not.toContain('$code:');
  });

  it('handles $code: values in arrays', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {
        api: {
          package: '@walkeros/destination-demo',
          code: 'destinationDemo',
          config: {
            settings: {
              transforms: ['$code:(x) => x * 2', '$code:(x) => x.trim()'],
            },
          },
        },
      },
    };

    const explicitCodeImports = new Map([
      ['@walkeros/destination-demo', new Set(['destinationDemo'])],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    expect(result).toContain('(x) => x * 2');
    expect(result).toContain('(x) => x.trim()');
    expect(result).not.toContain('$code:');
  });

  it('preserves normal strings without $code: prefix', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {
        api: {
          package: '@walkeros/destination-demo',
          code: 'destinationDemo',
          config: {
            settings: {
              url: 'https://api.example.com',
              name: 'Test API',
            },
          },
        },
      },
    };

    const explicitCodeImports = new Map([
      ['@walkeros/destination-demo', new Set(['destinationDemo'])],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    // Normal strings should be quoted
    expect(result).toContain('"url": "https://api.example.com"');
    expect(result).toContain('"name": "Test API"');
  });

  it('handles mixed $code: and regular values', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {
        api: {
          package: '@walkeros/destination-demo',
          code: 'destinationDemo',
          config: {
            settings: {
              name: 'Test',
              port: 8080,
              enabled: true,
              transform: '$code:(x) => x',
            },
          },
        },
      },
    };

    const explicitCodeImports = new Map([
      ['@walkeros/destination-demo', new Set(['destinationDemo'])],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    expect(result).toContain('"name": "Test"');
    expect(result).toContain('"port": 8080');
    expect(result).toContain('"enabled": true');
    expect(result).toContain('"transform": (x) => x');
  });
});

describe('generatePlatformWrapper', () => {
  it('generates web IIFE wrapper', () => {
    const config = '{ sources: {}, destinations: {} }';
    const userCode = 'console.log("custom code");';
    const buildOptions = {
      platform: 'browser',
      windowCollector: 'collector',
      windowElb: 'elb',
    };

    const result = generatePlatformWrapper(config, userCode, buildOptions);

    expect(result).toContain('(async () => {');
    expect(result).toContain(
      'const config = { sources: {}, destinations: {} };',
    );
    expect(result).toContain('console.log("custom code");');
    expect(result).toContain('await startFlow(config)');
    expect(result).toContain("window['collector'] = collector");
    expect(result).toContain("window['elb'] = elb");
  });

  it('generates server export default wrapper', () => {
    const config = '{ sources: {}, destinations: {} }';
    const userCode = '';
    const buildOptions = { platform: 'node' };

    const result = generatePlatformWrapper(config, userCode, buildOptions);

    expect(result).toContain('export default async function');
    expect(result).toContain(
      'const config = { sources: {}, destinations: {} };',
    );
    expect(result).toContain('const result = await startFlow(config)');
    expect(result).toContain('httpHandler');
    expect(result).not.toContain('window');
  });

  it('server wrapper strips port when externalServer provided', () => {
    const config =
      '{ sources: { http: { config: { settings: { port: 8080 } } } } }';
    const userCode = '';
    const buildOptions = { platform: 'node' };

    const result = generatePlatformWrapper(config, userCode, buildOptions);

    expect(result).toContain('context.externalServer');
    expect(result).toContain('delete src.config.settings.port');
  });
});

describe('createEntryPoint integration', () => {
  it('generates default import even when imports are specified', async () => {
    const flowSettings: Flow.Settings = {
      web: {},
      packages: {
        '@walkeros/web-source-browser': {
          imports: ['createTagger'],
        },
      },
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
          // No code - should use default import
        },
      },
      destinations: {},
    };

    const buildOptions = {
      platform: 'browser',
      format: 'esm',
      packages: {
        '@walkeros/web-source-browser': { imports: ['createTagger'] },
      },
      output: './dist/bundle.js',
      code: '',
    };

    const result = await createEntryPoint(
      flowSettings,
      buildOptions as BuildOptions,
      new Map([['@walkeros/web-source-browser', '/tmp/pkg']]),
    );

    // Should have BOTH default AND named imports
    expect(result).toContain(
      "import _walkerosWebSourceBrowser from '@walkeros/web-source-browser'",
    );
    expect(result).toContain(
      "import { createTagger } from '@walkeros/web-source-browser'",
    );
    // Config should use the default import variable
    expect(result).toContain('code: _walkerosWebSourceBrowser');
  });

  it('uses named import only when explicit code is specified', async () => {
    const flowSettings: Flow.Settings = {
      web: {},
      packages: {
        '@some/no-default-pkg': {
          imports: ['namedSource'],
        },
      },
      sources: {
        custom: {
          package: '@some/no-default-pkg',
          code: 'namedSource', // Explicit code
        },
      },
      destinations: {},
    };

    const buildOptions = {
      platform: 'browser',
      format: 'esm',
      packages: {
        '@some/no-default-pkg': { imports: ['namedSource'] },
      },
      output: './dist/bundle.js',
      code: '',
    };

    const result = await createEntryPoint(
      flowSettings,
      buildOptions as BuildOptions,
      new Map([['@some/no-default-pkg', '/tmp/pkg']]),
    );

    // Should have named import only, NO default import
    expect(result).toContain(
      "import { namedSource } from '@some/no-default-pkg'",
    );
    expect(result).not.toContain('import _someNoDefaultPkg from');
    // Config should use the named import
    expect(result).toContain('code: namedSource');
  });

  it('generates complete entry point with explicit code', async () => {
    const flowSettings: Flow.Settings = {
      server: {},
      packages: {
        '@walkeros/collector': { imports: ['startFlow'] },
        '@walkeros/server-source-express': {},
        '@walkeros/destination-demo': {},
      },
      sources: {
        http: {
          package: '@walkeros/server-source-express',
          code: 'sourceExpress',
          config: { settings: { port: 8080 } },
        },
      },
      destinations: {
        demo: {
          package: '@walkeros/destination-demo',
          code: 'destinationDemo',
          config: { settings: { name: 'Test' } },
        },
      },
    };

    const buildOptions = {
      platform: 'node',
      format: 'esm',
      packages: {
        '@walkeros/collector': { imports: ['startFlow'] },
        '@walkeros/server-source-express': {},
        '@walkeros/destination-demo': {},
      },
      output: './dist/bundle.mjs',
      code: '',
    };

    const result = await createEntryPoint(
      flowSettings,
      buildOptions as BuildOptions,
      new Map(),
    );

    // Should have named imports
    expect(result).toContain("import { startFlow } from '@walkeros/collector'");
    expect(result).toContain(
      "import { sourceExpress } from '@walkeros/server-source-express'",
    );
    expect(result).toContain(
      "import { destinationDemo } from '@walkeros/destination-demo'",
    );

    // Should use those imports in config
    expect(result).toContain('code: sourceExpress');
    expect(result).toContain('code: destinationDemo');

    // Should have server wrapper
    expect(result).toContain('export default async function');
  });
});

describe('Implicit Collector', () => {
  it('auto-imports startFlow when collector is in packages without imports specified', async () => {
    const flowSettings: Flow.Settings = {
      web: {},
      packages: {
        '@walkeros/collector': {}, // No imports specified
        '@walkeros/web-source-browser': {},
      },
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
        },
      },
      destinations: {},
    };

    const buildOptions = {
      platform: 'browser',
      format: 'esm',
      packages: {
        '@walkeros/collector': {}, // No imports specified
        '@walkeros/web-source-browser': {},
      },
      output: './dist/bundle.js',
      code: '',
    };

    const result = await createEntryPoint(
      flowSettings,
      buildOptions as BuildOptions,
      new Map([
        ['@walkeros/collector', '/tmp/collector'],
        ['@walkeros/web-source-browser', '/tmp/browser'],
      ]),
    );

    // Should auto-import startFlow from collector
    expect(result).toContain("import { startFlow } from '@walkeros/collector'");
  });

  it('auto-imports startFlow when collector has version but no imports', async () => {
    const flowSettings: Flow.Settings = {
      web: {},
      packages: {
        '@walkeros/collector': { version: '0.5.0' }, // Version only, no imports
        '@walkeros/web-source-browser': {},
      },
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
        },
      },
      destinations: {},
    };

    const buildOptions = {
      platform: 'browser',
      format: 'esm',
      packages: {
        '@walkeros/collector': { version: '0.5.0' },
        '@walkeros/web-source-browser': {},
      },
      output: './dist/bundle.js',
      code: '',
    };

    const result = await createEntryPoint(
      flowSettings,
      buildOptions as BuildOptions,
      new Map([
        ['@walkeros/collector', '/tmp/collector'],
        ['@walkeros/web-source-browser', '/tmp/browser'],
      ]),
    );

    // Should auto-import startFlow from collector
    expect(result).toContain("import { startFlow } from '@walkeros/collector'");
  });

  it('preserves explicit collector imports while adding startFlow', async () => {
    const flowSettings: Flow.Settings = {
      web: {},
      packages: {
        '@walkeros/collector': { imports: ['createCollector'] }, // Explicit import, no startFlow
        '@walkeros/web-source-browser': {},
      },
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
        },
      },
      destinations: {},
    };

    const buildOptions = {
      platform: 'browser',
      format: 'esm',
      packages: {
        '@walkeros/collector': { imports: ['createCollector'] },
        '@walkeros/web-source-browser': {},
      },
      output: './dist/bundle.js',
      code: '',
    };

    const result = await createEntryPoint(
      flowSettings,
      buildOptions as BuildOptions,
      new Map([
        ['@walkeros/collector', '/tmp/collector'],
        ['@walkeros/web-source-browser', '/tmp/browser'],
      ]),
    );

    // Should have both createCollector and startFlow
    expect(result).toContain('startFlow');
    expect(result).toContain('createCollector');
  });
});

describe('detectTransformerPackages', () => {
  it('detects transformer packages from flow config', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {},
      transformers: {
        fingerprint: {
          package: '@walkeros/server-transformer-fingerprint',
          code: 'transformerFingerprint',
          config: { settings: { output: 'user.hash' } },
        },
        validate: {
          package: '@walkeros/transformer-validator',
        },
      },
    };

    const result = detectTransformerPackages(flowSettings);

    expect(result).toEqual(
      new Set([
        '@walkeros/server-transformer-fingerprint',
        '@walkeros/transformer-validator',
      ]),
    );
  });

  it('returns empty set when no transformers', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {},
    };

    const result = detectTransformerPackages(flowSettings);

    expect(result).toEqual(new Set());
  });
});

describe('detectExplicitCodeImports', () => {
  it('detects explicit code imports from transformers', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {},
      transformers: {
        fingerprint: {
          package: '@walkeros/server-transformer-fingerprint',
          code: 'transformerFingerprint',
          config: {},
        },
      },
    };

    const result = detectExplicitCodeImports(flowSettings);

    expect(result.get('@walkeros/server-transformer-fingerprint')).toEqual(
      new Set(['transformerFingerprint']),
    );
  });
});

describe('transformer support', () => {
  it('includes transformers in config object', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {},
      transformers: {
        fingerprint: {
          package: '@walkeros/server-transformer-fingerprint',
          code: 'transformerFingerprint',
          config: {
            settings: {
              fields: ['ingest.ip', 'ingest.userAgent'],
              output: 'user.hash',
            },
          },
        },
      },
    };

    const explicitCodeImports = new Map([
      [
        '@walkeros/server-transformer-fingerprint',
        new Set(['transformerFingerprint']),
      ],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    expect(result).toContain('transformers:');
    expect(result).toContain('fingerprint:');
    expect(result).toContain('code: transformerFingerprint');
    expect(result).toContain('"output": "user.hash"');
  });

  it('handles transformer next field as top-level property', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {},
      transformers: {
        enrich: {
          package: '@walkeros/transformer-enricher',
          code: 'transformerEnrich',
          config: { apiUrl: 'https://api.example.com' },
          next: 'validate',
        },
        validate: {
          package: '@walkeros/transformer-validator',
          code: 'transformerValidator',
          config: {},
        },
      },
    };

    const explicitCodeImports = new Map([
      ['@walkeros/transformer-enricher', new Set(['transformerEnrich'])],
      ['@walkeros/transformer-validator', new Set(['transformerValidator'])],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    // next should be a top-level property (consistent with destination.before)
    expect(result).toContain('next: "validate"');
  });

  it('handles $code: prefix in transformer config', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {},
      transformers: {
        fingerprint: {
          package: '@walkeros/server-transformer-fingerprint',
          code: 'transformerFingerprint',
          config: {
            settings: {
              fields: [{ fn: '$code:() => new Date().getDate()' }, 'ingest.ip'],
            },
          },
        },
      },
    };

    const explicitCodeImports = new Map([
      [
        '@walkeros/server-transformer-fingerprint',
        new Set(['transformerFingerprint']),
      ],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    expect(result).toContain('"fn": () => new Date().getDate()');
    expect(result).not.toContain('$code:');
  });
});

describe('chain property handling', () => {
  describe('source.next', () => {
    it('includes next property for package-based source', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {
          http: {
            package: '@walkeros/server-source-express',
            code: 'sourceExpress',
            next: 'validate',
          },
        },
        destinations: {},
      };

      const explicitCodeImports = new Map([
        ['@walkeros/server-source-express', new Set(['sourceExpress'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      expect(result).toContain('next: "validate"');
    });

    it('includes next property for inline source', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {
          custom: {
            code: { type: 'test', push: '$code:(e) => e' },
            next: 'validate',
          },
        },
        destinations: {},
      };

      const result = buildConfigObject(flowSettings, new Map());

      expect(result).toContain('next: "validate"');
    });

    it('handles array next property for source', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {
          http: {
            package: '@walkeros/server-source-express',
            code: 'sourceExpress',
            next: ['validate', 'enrich'],
          },
        },
        destinations: {},
      };

      const explicitCodeImports = new Map([
        ['@walkeros/server-source-express', new Set(['sourceExpress'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      expect(result).toContain('next: ["validate","enrich"]');
    });

    it('omits next property when not specified for source', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {
          http: {
            package: '@walkeros/server-source-express',
            code: 'sourceExpress',
          },
        },
        destinations: {},
      };

      const explicitCodeImports = new Map([
        ['@walkeros/server-source-express', new Set(['sourceExpress'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      expect(result).not.toContain('next:');
    });
  });

  describe('destination.before', () => {
    it('includes before property for package-based destination', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {},
        destinations: {
          api: {
            package: '@walkeros/destination-api',
            code: 'destApi',
            before: 'redact',
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/destination-api', new Set(['destApi'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      expect(result).toContain('before: "redact"');
    });

    it('includes before property for inline destination', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {},
        destinations: {
          custom: {
            code: { type: 'test', push: '$code:(e) => e' },
            before: 'redact',
          },
        },
      };

      const result = buildConfigObject(flowSettings, new Map());

      expect(result).toContain('before: "redact"');
    });

    it('handles array before property for destination', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {},
        destinations: {
          api: {
            package: '@walkeros/destination-api',
            code: 'destApi',
            before: ['redact', 'validate'],
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/destination-api', new Set(['destApi'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      expect(result).toContain('before: ["redact","validate"]');
    });

    it('omits before property when not specified for destination', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {},
        destinations: {
          api: {
            package: '@walkeros/destination-api',
            code: 'destApi',
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/destination-api', new Set(['destApi'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      expect(result).not.toContain('before:');
    });
  });

  describe('transformer.next', () => {
    it('includes next property for package-based transformer', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {},
        destinations: {},
        transformers: {
          validate: {
            package: '@walkeros/transformer-validator',
            code: 'validator',
            next: 'enrich',
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/transformer-validator', new Set(['validator'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      expect(result).toContain('next: "enrich"');
    });

    it('includes next property for inline transformer', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {},
        destinations: {},
        transformers: {
          validate: {
            code: { type: 'test', push: '$code:(e) => e' },
            next: 'enrich',
          },
        },
      };

      const result = buildConfigObject(flowSettings, new Map());

      expect(result).toContain('next: "enrich"');
    });

    it('handles array next property for transformer', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {},
        destinations: {},
        transformers: {
          validate: {
            package: '@walkeros/transformer-validator',
            code: 'validator',
            next: ['enrich', 'redact'],
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/transformer-validator', new Set(['validator'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      expect(result).toContain('next: ["enrich","redact"]');
    });

    it('omits next property when not specified for transformer', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {},
        destinations: {},
        transformers: {
          validate: {
            package: '@walkeros/transformer-validator',
            code: 'validator',
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/transformer-validator', new Set(['validator'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      expect(result).not.toContain('next:');
    });
  });

  describe('full chain integration', () => {
    it('preserves all chain properties in complete flow', () => {
      const flowSettings: Flow.Settings = {
        server: {},
        sources: {
          http: {
            package: '@walkeros/server-source-express',
            code: 'sourceExpress',
            next: 'validate',
          },
        },
        transformers: {
          validate: {
            package: '@walkeros/transformer-validator',
            code: 'validator',
            next: 'enrich',
          },
          enrich: {
            package: '@walkeros/transformer-enricher',
            code: 'enricher',
          },
          redact: {
            package: '@walkeros/transformer-redact',
            code: 'redactor',
          },
        },
        destinations: {
          api: {
            package: '@walkeros/destination-api',
            code: 'destApi',
            before: 'redact',
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/server-source-express', new Set(['sourceExpress'])],
        ['@walkeros/transformer-validator', new Set(['validator'])],
        ['@walkeros/transformer-enricher', new Set(['enricher'])],
        ['@walkeros/transformer-redact', new Set(['redactor'])],
        ['@walkeros/destination-api', new Set(['destApi'])],
      ]);

      const result = buildConfigObject(flowSettings, explicitCodeImports);

      // Source has pre-collector chain
      expect(result).toMatch(/sources:[\s\S]*next: "validate"/);

      // Transformer has chain link
      expect(result).toMatch(
        /transformers:[\s\S]*validate:[\s\S]*next: "enrich"/,
      );

      // Destination has post-collector chain
      expect(result).toMatch(/destinations:[\s\S]*before: "redact"/);
    });
  });
});

describe('full flow with transformers', () => {
  it('generates complete config with source -> transformer -> destination chain', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {
        express: {
          package: '@walkeros/server-source-express',
          code: 'sourceExpress',
          config: { settings: { port: 8080 } },
          next: 'fingerprint',
        },
      },
      transformers: {
        fingerprint: {
          package: '@walkeros/server-transformer-fingerprint',
          code: 'transformerFingerprint',
          config: {
            settings: {
              fields: [{ fn: '$code:() => new Date().getDate()' }, 'ingest.ip'],
              output: 'user.hash',
            },
          },
        },
      },
      destinations: {
        bigquery: {
          package: '@walkeros/server-destination-bigquery',
          code: 'destinationBigQuery',
          config: { settings: { projectId: 'my-project' } },
        },
      },
    };

    const explicitCodeImports = new Map([
      ['@walkeros/server-source-express', new Set(['sourceExpress'])],
      [
        '@walkeros/server-transformer-fingerprint',
        new Set(['transformerFingerprint']),
      ],
      [
        '@walkeros/server-destination-bigquery',
        new Set(['destinationBigQuery']),
      ],
    ]);

    const result = buildConfigObject(flowSettings, explicitCodeImports);

    // Sources with chain property
    expect(result).toContain('sources:');
    expect(result).toContain('code: sourceExpress');
    expect(result).toContain('next: "fingerprint"');

    // Transformers
    expect(result).toContain('transformers:');
    expect(result).toContain('code: transformerFingerprint');
    expect(result).toContain('"fn": () => new Date().getDate()');

    // Destinations
    expect(result).toContain('destinations:');
    expect(result).toContain('code: destinationBigQuery');
  });
});

describe('$store: prefix', () => {
  it('should resolve $store: to stores variable reference', () => {
    const result = serializeWithCode('$store:cache', 0);
    expect(result).toBe('stores.cache');
  });

  it('should resolve $store: in nested objects', () => {
    const result = serializeWithCode({ store: '$store:files' }, 0);
    expect(result).toContain('stores.files');
  });
});

describe('Error Handling', () => {
  it('should reject invalid config structure', async () => {
    expect(() => {
      loadBundleConfig(
        {
          flow: {
            platform: 'web',
          },
          build: {
            packages: {},
          },
        },
        { configPath: '/test/config.json' },
      );
    }).toThrow(/Invalid configuration/);
  });
});
