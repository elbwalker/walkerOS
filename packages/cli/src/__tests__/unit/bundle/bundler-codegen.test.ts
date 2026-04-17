import {
  buildSplitConfigObject,
  createEntryPoint,
  detectStepPackages,
  detectExplicitCodeImports,
  serializeWithCode,
  generateSplitWireConfigModule,
  generateWebEntry,
  generateWrapEntry,
} from '../../../commands/bundle/bundler.js';
import { loadBundleConfig } from '../../../config/index.js';
import type { Flow } from '@walkeros/core';
import type { BuildOptions } from '../../../types/bundle.js';

describe('createEntryPoint integration', () => {
  it('generates default import even when imports are specified', async () => {
    const flowSettings: Flow.Settings = {
      web: {},
      bundle: {
        packages: {
          '@walkeros/web-source-browser': {
            imports: ['createTagger'],
          },
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

    const { codeEntry: result } = await createEntryPoint(
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
      bundle: {
        packages: {
          '@some/no-default-pkg': {
            imports: ['namedSource'],
          },
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

    const { codeEntry: result } = await createEntryPoint(
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
      bundle: {
        packages: {
          '@walkeros/collector': { imports: ['startFlow'] },
          '@walkeros/server-source-express': {},
          '@walkeros/destination-demo': {},
        },
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

    const { codeEntry: result } = await createEntryPoint(
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

    // Should have wireConfig ESM module with __data parameter (not platform wrapper)
    expect(result).toContain('export function wireConfig(__data)');
    expect(result).toContain('export { startFlow }');
  });

  it('generates valid store references in full entry point', async () => {
    const flowSettings: Flow.Settings = {
      server: {},
      bundle: {
        packages: {
          '@walkeros/collector': { imports: ['startFlow'] },
          '@walkeros/server-source-express': {},
          '@walkeros/server-transformer-fingerprint': {},
          '@walkeros/store-memory': {},
        },
      },
      sources: {
        http: {
          package: '@walkeros/server-source-express',
          code: 'sourceExpress',
          config: { settings: { port: 8080 } },
          next: 'fp',
        },
      },
      destinations: {},
      transformers: {
        fp: {
          package: '@walkeros/server-transformer-fingerprint',
          code: 'transformerFingerprint',
          config: {},
          env: { store: '$store:cache' },
        },
      },
      stores: {
        cache: {
          package: '@walkeros/store-memory',
          code: 'storeMemory',
          config: { settings: { maxSize: 1000 } },
        },
      },
    } as Flow.Settings;

    const buildOptions = {
      platform: 'node',
      format: 'esm',
      packages: {
        '@walkeros/collector': { imports: ['startFlow'] },
        '@walkeros/server-source-express': {},
        '@walkeros/server-transformer-fingerprint': {},
        '@walkeros/store-memory': {},
      },
      output: './dist/bundle.mjs',
      code: '',
    };

    const { codeEntry: result } = await createEntryPoint(
      flowSettings,
      buildOptions as BuildOptions,
      new Map(),
    );

    // stores declaration must appear BEFORE config
    const storesIdx = result.indexOf('const stores = {');
    const configIdx = result.indexOf('const config = {');
    expect(storesIdx).toBeGreaterThan(-1);
    expect(configIdx).toBeGreaterThan(-1);
    expect(storesIdx).toBeLessThan(configIdx);

    // Config should reference stores.cache (not define stores inline)
    expect(result).toContain('stores.cache');
    // Config should use shorthand stores property
    expect(result).toMatch(/stores,?\s/);
  });
});

describe('Implicit Collector', () => {
  it('auto-imports startFlow when collector is in packages without imports specified', async () => {
    const flowSettings: Flow.Settings = {
      web: {},
      bundle: {
        packages: {
          '@walkeros/collector': {}, // No imports specified
          '@walkeros/web-source-browser': {},
        },
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

    const { codeEntry: result } = await createEntryPoint(
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
      bundle: {
        packages: {
          '@walkeros/collector': { version: '0.5.0' }, // Version only, no imports
          '@walkeros/web-source-browser': {},
        },
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

    const { codeEntry: result } = await createEntryPoint(
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
      bundle: {
        packages: {
          '@walkeros/collector': { imports: ['createCollector'] }, // Explicit import, no startFlow
          '@walkeros/web-source-browser': {},
        },
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

    const { codeEntry: result } = await createEntryPoint(
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

describe('detectStepPackages', () => {
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

    const result = detectStepPackages(flowSettings, 'transformers');

    expect(result).toEqual(
      new Set([
        '@walkeros/server-transformer-fingerprint',
        '@walkeros/transformer-validator',
      ]),
    );
  });

  it('returns empty set when section is missing', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {},
    };

    const result = detectStepPackages(flowSettings, 'transformers');

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

describe('$store: prefix', () => {
  it('should resolve $store: to stores variable reference', () => {
    const result = serializeWithCode('$store:cache', 0);
    expect(result).toBe('stores.cache');
  });

  it('should resolve $store: in nested objects', () => {
    const result = serializeWithCode({ store: '$store:files' }, 0);
    expect(result).toContain('stores.files');
  });

  it('should generate stores as hoisted variable referenced by config', () => {
    const flowSettings: Flow.Settings = {
      server: {},
      sources: {},
      destinations: {},
      transformers: {
        fp: {
          package: '@walkeros/server-transformer-fingerprint',
          code: 'transformerFingerprint',
          config: {},
          env: { store: '$store:cache' },
        },
      },
      stores: {
        cache: {
          package: '@walkeros/store-memory',
          code: 'storeMemory',
          config: { settings: { maxSize: 1000 } },
        },
      },
    } as Flow.Settings;

    const explicitCodeImports = new Map([
      [
        '@walkeros/server-transformer-fingerprint',
        new Set(['transformerFingerprint']),
      ],
      ['@walkeros/store-memory', new Set(['storeMemory'])],
    ]);

    const result = buildSplitConfigObject(flowSettings, explicitCodeImports);

    // stores must be a separate declaration, not inside the config object
    expect(result.storesDeclaration).toContain('const stores = {');
    expect(result.storesDeclaration).toContain('code: storeMemory');

    // Code config object should reference stores via shorthand property
    expect(result.codeConfigObject).toMatch(/,\n\s+stores/);
    // And transformers should reference stores.cache (resolved by serializeWithCode)
    expect(result.codeConfigObject).toContain('stores.cache');
    // stores section should NOT be inlined in the config object
    expect(result.codeConfigObject).not.toMatch(
      /stores:\s*\{[\s\S]*code: storeMemory/,
    );
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

describe('buildSplitConfigObject', () => {
  it('splits plain config values into data payload', () => {
    const flowSettings = {
      server: {},
      bundle: {
        packages: { '@walkeros/server-source-express': {} },
      },
      sources: {
        express: {
          package: '@walkeros/server-source-express',
          config: { settings: { port: 8080 } },
        },
      },
      destinations: {},
    } as Flow.Settings;

    const result = buildSplitConfigObject(flowSettings, new Map());

    // Code skeleton references __data
    expect(result.codeConfigObject).toContain('__data.sources.express.config');
    // Data payload has the actual value
    expect(result.dataPayload).toContain('8080');
  });

  it('keeps $store: env in code skeleton', () => {
    const flowSettings = {
      server: {},
      bundle: {
        packages: { '@walkeros/web-destination-ga4': {} },
      },
      sources: {},
      destinations: {
        ga4: {
          package: '@walkeros/web-destination-ga4',
          config: { settings: { measurementId: 'G-ABC' } },
          env: { store: '$store:memory' },
        },
      },
    } as Flow.Settings;

    const result = buildSplitConfigObject(flowSettings, new Map());

    // $store: stays in code skeleton
    expect(result.codeConfigObject).toContain('stores.memory');
    // Plain config goes to data
    expect(result.dataPayload).toContain('G-ABC');
  });

  it('keeps $code: config in code skeleton', () => {
    const flowSettings = {
      server: {},
      sources: {},
      destinations: {
        custom: {
          package: '@walkeros/destination-custom',
          config: {
            settings: { fn: '$code:() => true' },
          },
        },
      },
    } as Flow.Settings;

    const result = buildSplitConfigObject(flowSettings, new Map());

    // $code: value stays in code skeleton (serialized with processConfigValue)
    expect(result.codeConfigObject).toContain('config:');
    expect(result.codeConfigObject).toContain('() => true');
    // Not in data payload
    expect(result.dataPayload).not.toContain('() => true');
  });

  it('handles inline code steps entirely in code skeleton', () => {
    const flowSettings = {
      server: {},
      sources: {
        custom: {
          code: { type: 'test', push: '$code:(e) => e' },
          config: { settings: { port: 3000 } },
          next: 'validate',
        },
      },
      destinations: {},
    } as Flow.Settings;

    const result = buildSplitConfigObject(flowSettings, new Map());

    // Inline code goes entirely to code skeleton
    expect(result.codeConfigObject).toContain('(e) => e');
    // Settings baked into inline code output (not split to data)
    expect(result.codeConfigObject).toContain('3000');
  });

  it('handles transformers section', () => {
    const flowSettings = {
      server: {},
      sources: {},
      destinations: {},
      transformers: {
        fingerprint: {
          package: '@walkeros/server-transformer-fingerprint',
          config: {
            settings: { fields: ['ingest.ip'], output: 'user.hash' },
          },
        },
      },
    } as Flow.Settings;

    const result = buildSplitConfigObject(flowSettings, new Map());

    expect(result.codeConfigObject).toContain('transformers:');
    expect(result.codeConfigObject).toContain(
      '__data.transformers.fingerprint.config',
    );
    expect(result.dataPayload).toContain('user.hash');
  });

  it('handles stores with plain config in data payload', () => {
    const flowSettings = {
      server: {},
      sources: {},
      destinations: {},
      stores: {
        memory: {
          package: '@walkeros/store-memory',
          config: { settings: { maxSize: 1000 } },
        },
      },
    } as Flow.Settings;

    const result = buildSplitConfigObject(flowSettings, new Map());

    // Store config (plain) goes to data payload
    expect(result.dataPayload).toContain('1000');
    // Store declaration references __data for plain config
    expect(result.storesDeclaration).toContain('__data.stores.memory.config');
  });

  it('puts plain collector in data payload', () => {
    const flowSettings = {
      server: {},
      sources: {},
      destinations: {},
      collector: { settings: { batchSize: 10 } },
    } as unknown as Flow.Settings;

    const result = buildSplitConfigObject(flowSettings, new Map());

    expect(result.codeConfigObject).toContain('...__data.collector');
    expect(result.dataPayload).toContain('batchSize');
  });

  it('keeps code-marker collector in code skeleton', () => {
    const flowSettings = {
      server: {},
      sources: {},
      destinations: {},
      collector: { onError: '$code:(err) => console.error(err)' },
    } as unknown as Flow.Settings;

    const result = buildSplitConfigObject(flowSettings, new Map());

    // Code-marker collector stays in code skeleton
    expect(result.codeConfigObject).toContain('console.error');
    expect(result.codeConfigObject).not.toContain('__data.collector');
  });

  it('handles explicit code imports', () => {
    const flowSettings = {
      server: {},
      sources: {
        http: {
          package: '@walkeros/server-source-express',
          code: 'sourceExpress',
          config: { settings: { port: 8080 } },
        },
      },
      destinations: {},
    } as Flow.Settings;

    const explicitCodeImports = new Map([
      ['@walkeros/server-source-express', new Set(['sourceExpress'])],
    ]);

    const result = buildSplitConfigObject(flowSettings, explicitCodeImports);

    // Should use explicit code name
    expect(result.codeConfigObject).toContain('code: sourceExpress');
    // Config still goes to data
    expect(result.dataPayload).toContain('8080');
  });

  it('handles next/before/cache/primary as data props when plain', () => {
    const flowSettings = {
      server: {},
      sources: {
        http: {
          package: '@walkeros/server-source-express',
          config: {},
          next: ['validate', 'enrich'],
          cache: { rules: [{ match: '*', key: ['entity'], ttl: 60 }] },
          primary: true,
        },
      },
      destinations: {
        ga4: {
          package: '@walkeros/web-destination-ga4',
          config: {},
          before: ['fingerprint'],
        },
      },
    } as Flow.Settings;

    const result = buildSplitConfigObject(flowSettings, new Map());

    // next, cache, primary are plain → data payload
    expect(result.codeConfigObject).toContain('__data.sources.http.next');
    expect(result.codeConfigObject).toContain('__data.sources.http.cache');
    expect(result.codeConfigObject).toContain('__data.sources.http.primary');
    expect(result.dataPayload).toContain('validate');
    expect(result.dataPayload).toContain('60');

    // before is plain → data payload
    expect(result.codeConfigObject).toContain('__data.destinations.ga4.before');
    expect(result.dataPayload).toContain('fingerprint');
  });
});

describe('generateSplitWireConfigModule', () => {
  it('generates wireConfig with __data parameter', () => {
    const result = generateSplitWireConfigModule(
      'const stores = {};',
      '{ sources: { express: { code: _src, config: __data.sources.express.config } } }',
      '',
    );
    expect(result).toContain('export function wireConfig(__data)');
    expect(result).toContain('__data.sources.express.config');
    expect(result).toContain('return config;');
    expect(result).toContain('export { startFlow }');
  });

  it('includes user code section when provided', () => {
    const result = generateSplitWireConfigModule(
      'const stores = {};',
      '{ sources: {} }',
      'const myHelper = () => {};',
    );
    expect(result).toContain('const myHelper = () => {};');
  });

  it('includes stores declaration before config', () => {
    const result = generateSplitWireConfigModule(
      'const stores = { cache: { code: storeMemory, config: {} } };',
      '{ sources: {}, stores }',
      '',
    );
    const storesIdx = result.indexOf('const stores =');
    const configIdx = result.indexOf('const config =');
    expect(storesIdx).toBeGreaterThan(-1);
    expect(configIdx).toBeGreaterThan(-1);
    expect(storesIdx).toBeLessThan(configIdx);
  });
});

describe('generateWrapEntry preview preflight', () => {
  it('includes preflight when previewOrigin and previewScope are set', () => {
    const output = generateWrapEntry('./skeleton.mjs', {
      previewOrigin: 'cdn.walkeros.io',
      previewScope: 'proj_abc123',
    });
    expect(output).toContain('elbPreview');
    expect(output).toContain('URLSearchParams');
    expect(output).toContain('cdn.walkeros.io');
    expect(output).toContain('proj_abc123');
  });

  it('preflight runs BEFORE startFlow', () => {
    const output = generateWrapEntry('./skeleton.mjs', {
      previewOrigin: 'cdn.walkeros.io',
      previewScope: 'proj_abc123',
    });
    const previewIdx = output.indexOf('elbPreview');
    const startFlowIdx = output.indexOf('startFlow(config)');
    expect(previewIdx).toBeLessThan(startFlowIdx);
  });

  it('omits preflight entirely when previewOrigin is absent', () => {
    const output = generateWrapEntry('./skeleton.mjs', {});
    expect(output).not.toContain('elbPreview');
    // Config is built from __configData via wireConfig, then passed to startFlow
    expect(output).toContain('wireConfig(__configData)');
    expect(output).toContain('startFlow(config)');
  });

  it('omits preflight when previewScope is empty string', () => {
    const output = generateWrapEntry('./skeleton.mjs', {
      previewOrigin: 'cdn.walkeros.io',
      previewScope: '',
    });
    expect(output).not.toContain('elbPreview');
  });

  it('preserves window assignments alongside preflight', () => {
    const output = generateWrapEntry('./skeleton.mjs', {
      windowCollector: 'collector',
      windowElb: 'elb',
      previewOrigin: 'cdn.walkeros.io',
      previewScope: 'proj_test',
    });
    expect(output).toContain("window['collector']");
    expect(output).toContain("window['elb']");
    expect(output).toContain('elbPreview');
  });
});

describe('generateWebEntry env injection', () => {
  it('injects env.window and env.document for all sources before startFlow', () => {
    const output = generateWebEntry('./stage1.mjs', '{"flows":{}}', {
      windowCollector: 'walkerOS',
      windowElb: 'elb',
    });

    // Must walk sources and inject env.window / env.document
    expect(output).toContain('for');
    expect(output).toMatch(/config\.sources[\s\S]*env\s*=/);
    expect(output).toContain(
      "typeof window !== 'undefined' ? window : undefined",
    );
    expect(output).toContain(
      "typeof document !== 'undefined' ? document : undefined",
    );

    // Must happen BEFORE startFlow call
    const injectIdx = output.search(/env\.window\s*=/);
    const startIdx = output.indexOf('startFlow(');
    expect(injectIdx).toBeGreaterThan(-1);
    expect(injectIdx).toBeLessThan(startIdx);
  });

  it('preserves existing source env fields without overwriting', () => {
    const output = generateWebEntry('./stage1.mjs', '{}', {});
    // Injection should use fallback assignment (??) or explicit check,
    // not clobber user-provided env values
    expect(output).toMatch(
      /env\.window\s*=\s*env\.window\s*\?\?|env\.window\s*\|\|=/,
    );
  });
});

describe('generateWrapEntry env injection', () => {
  it('injects env.window/env.document for all sources', () => {
    const output = generateWrapEntry('./skeleton.mjs', {});
    expect(output).toContain(
      "typeof window !== 'undefined' ? window : undefined",
    );
    expect(output).toContain(
      "typeof document !== 'undefined' ? document : undefined",
    );
    const injectIdx = output.search(/env\.window\s*=/);
    const startIdx = output.indexOf('startFlow(');
    expect(injectIdx).toBeGreaterThan(-1);
    expect(injectIdx).toBeLessThan(startIdx);
  });

  it('env injection runs even when preview preflight is enabled', () => {
    const output = generateWrapEntry('./skeleton.mjs', {
      previewOrigin: 'preview.example.com',
      previewScope: 'scope1',
    });
    expect(output).toContain(
      "typeof window !== 'undefined' ? window : undefined",
    );
    // Preview preflight exits with `return;` — env injection must be AFTER the preflight
    const previewReturnIdx = output.indexOf('document.head.appendChild');
    const injectIdx = output.search(/env\.window\s*=/);
    expect(previewReturnIdx).toBeGreaterThan(-1);
    expect(injectIdx).toBeGreaterThan(previewReturnIdx);
  });
});

describe('previewScope / previewOrigin validation', () => {
  it('throws on path-traversal previewScope', async () => {
    const { wrapSkeleton } = await import('../../../commands/bundle/wrap.js');
    await expect(
      wrapSkeleton({
        skeletonPath: '/tmp/fake.mjs',
        platform: 'browser',
        outputPath: '/tmp/out.js',
        previewScope: '../evil',
      }),
    ).rejects.toThrow(/Invalid previewScope/);
  });

  it('throws on previewOrigin with special characters', async () => {
    const { wrapSkeleton } = await import('../../../commands/bundle/wrap.js');
    await expect(
      wrapSkeleton({
        skeletonPath: '/tmp/fake.mjs',
        platform: 'browser',
        outputPath: '/tmp/out.js',
        previewOrigin: 'evil.com/x?',
      }),
    ).rejects.toThrow(/Invalid previewOrigin/);
  });
});
