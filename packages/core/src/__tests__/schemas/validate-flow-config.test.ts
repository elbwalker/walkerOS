import { validateFlowConfig } from '../../schemas/validate-flow-config';

describe('validateFlowConfig', () => {
  // --- JSON Parse Errors ---

  it('returns error for invalid JSON', () => {
    const result = validateFlowConfig('{');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].severity).toBe('error');
    expect(result.errors[0].line).toBeGreaterThan(0);
  });

  it('returns error for empty string', () => {
    const result = validateFlowConfig('');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  // --- Schema Errors ---

  it('returns error for missing version', () => {
    const json = JSON.stringify(
      { flows: { default: { config: { platform: 'web' } } } },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error for invalid version', () => {
    const json = JSON.stringify(
      { version: 99, flows: { default: { config: { platform: 'web' } } } },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(false);
  });

  it('returns error for missing flows', () => {
    const json = JSON.stringify({ version: 4 }, null, 2);
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(false);
  });

  it('passes for minimal valid config', () => {
    const json = JSON.stringify(
      { version: 4, flows: { default: { config: { platform: 'web' } } } },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- Line/Column Positions ---

  it('provides line/column for schema errors', () => {
    const json = JSON.stringify({ flows: {} }, null, 2);
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    for (const e of result.errors) {
      expect(e.line).toBeGreaterThan(0);
      expect(e.column).toBeGreaterThan(0);
    }
  });

  // --- Reference Warnings ---

  it('warns for dangling $var. reference', () => {
    const json = JSON.stringify(
      {
        version: 4,
        variables: { gaId: 'G-XXX' },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              ga4: {
                package: '@walkeros/web-destination-gtag',
                config: { settings: { id: '$var.nonExistent' } },
              },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(true); // warnings don't make it invalid
    expect(
      result.warnings.some((w) => w.message.includes('$var.nonExistent')),
    ).toBe(true);
    expect(result.warnings[0].line).toBeGreaterThan(0);
  });

  it('does not warn for valid $var. reference', () => {
    const json = JSON.stringify(
      {
        version: 4,
        variables: { gaId: 'G-XXX' },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              ga4: {
                config: { settings: { id: '$var.gaId' } },
              },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(
      result.warnings.filter((w) => w.message.includes('$var.')),
    ).toHaveLength(0);
  });

  it('warns for dangling $var. reference with sibling defined', () => {
    const json = JSON.stringify(
      {
        version: 4,
        variables: { clean: {} },
        flows: {
          default: {
            config: { platform: 'web' },
            destinations: {
              ga4: { config: { transform: '$var.missing' } },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(
      result.warnings.some((w) => w.message.includes('$var.missing')),
    ).toBe(true);
  });

  // --- Context Extraction ---

  it('returns context with variables', () => {
    const json = JSON.stringify(
      {
        version: 4,
        variables: { gaId: 'G-XXX', debug: false },
        flows: { default: { config: { platform: 'web' } } },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.variables).toEqual({ gaId: 'G-XXX', debug: false });
  });

  it('returns context with step names', () => {
    const json = JSON.stringify(
      {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            sources: { browser: {} },
            destinations: { ga4: {}, meta: {} },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.stepNames?.sources).toEqual(['browser']);
    expect(result.context?.stepNames?.destinations).toEqual(['ga4', 'meta']);
  });

  it('returns context with platform', () => {
    const json = JSON.stringify(
      { version: 4, flows: { default: { config: { platform: 'server' } } } },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.platform).toBe('server');
  });

  it('returns context with packages', () => {
    const json = JSON.stringify(
      {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            sources: {
              browser: { package: '@walkeros/web-source-browser' },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.packages).toEqual([
      {
        package: '@walkeros/web-source-browser',
        shortName: 'browser',
        type: 'source',
        platform: 'web',
      },
    ]);
  });

  it('returns context with contract entities', () => {
    const json = JSON.stringify(
      {
        version: 4,
        contract: {
          default: {
            events: { page: { view: {}, read: {} } },
          },
        },
        flows: { default: { config: { platform: 'web' } } },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.contract).toEqual([
      {
        entity: 'page',
        actions: ['view', 'read'],
        properties: { view: {}, read: {} },
      },
    ]);
  });

  it('returns context contract with typed property info and descriptions', () => {
    const json = JSON.stringify(
      {
        version: 4,
        contract: {
          default: {
            events: {
              order: {
                complete: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      required: ['total'],
                      properties: {
                        total: {
                          type: 'number',
                          description: 'Order total in EUR',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        flows: { default: { config: { platform: 'server' } } },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    const order = result.context?.contract?.find((c) => c.entity === 'order');
    expect(order?.actions).toEqual(['complete']);
    expect(order?.properties?.complete?.total).toEqual({
      type: 'number',
      description: 'Order total in EUR',
      required: true,
    });
  });

  it('returns empty context for invalid JSON', () => {
    const result = validateFlowConfig('{');
    expect(result.context).toBeUndefined();
  });

  it('returns context with store names', () => {
    const json = JSON.stringify(
      {
        version: 4,
        flows: {
          default: {
            config: { platform: 'server' },
            stores: { files: { package: '@walkeros/server-store-fs' } },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.stepNames?.stores).toEqual(['files']);
  });

  it('returns context with flow names', () => {
    const json = JSON.stringify(
      {
        version: 4,
        flows: {
          web: { config: { platform: 'web' } },
          server: { config: { platform: 'server' } },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.flowNames).toEqual(['web', 'server']);
  });

  it('aggregates stores across multiple flows', () => {
    const json = JSON.stringify(
      {
        version: 4,
        flows: {
          a: {
            config: { platform: 'server' },
            stores: { cache: { package: '@walkeros/server-store-fs' } },
          },
          b: {
            config: { platform: 'server' },
            stores: { files: { package: '@walkeros/server-store-fs' } },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.context?.stepNames?.stores?.sort()).toEqual([
      'cache',
      'files',
    ]);
  });

  // --- Symmetric before/next ---

  it('accepts source with before property', () => {
    const json = JSON.stringify(
      {
        version: 4,
        flows: {
          test: {
            config: { platform: 'server' },
            sources: {
              express: {
                package: '@walkeros/server-source-express',
                before: 'decoder',
                next: 'fingerprint',
              },
            },
            transformers: {
              decoder: { package: '@walkeros/transformer-decoder' },
              fingerprint: { package: '@walkeros/transformer-fingerprint' },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(true);
  });

  it('accepts transformer with before property', () => {
    const json = JSON.stringify(
      {
        version: 4,
        flows: {
          test: {
            config: { platform: 'server' },
            sources: { s: { package: '@walkeros/server-source-express' } },
            transformers: {
              enrich: {
                package: '@walkeros/transformer-enricher',
                before: 'lookup',
                next: 'fingerprint',
              },
              lookup: { package: '@walkeros/transformer-lookup' },
              fingerprint: { package: '@walkeros/transformer-fingerprint' },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(true);
  });

  it('accepts destination with next property', () => {
    const json = JSON.stringify(
      {
        version: 4,
        flows: {
          test: {
            config: { platform: 'server' },
            sources: { s: { package: '@walkeros/server-source-express' } },
            destinations: {
              ga4: {
                package: '@walkeros/server-destination-ga4',
                before: 'redact',
                next: 'auditLog',
              },
            },
            transformers: {
              redact: { package: '@walkeros/transformer-redact' },
              auditLog: { package: '@walkeros/transformer-audit' },
            },
          },
        },
      },
      null,
      2,
    );
    const result = validateFlowConfig(json);
    expect(result.valid).toBe(true);
  });

  // --- $store. references ---

  describe('$store. references', () => {
    it('warns for dangling $store. reference', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: { files: { package: '@walkeros/server-store-fs' } },
              transformers: {
                t: {
                  package: '@walkeros/transformer-redact',
                  env: { store: '$store.missing' },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.some((w) => w.message.includes('$store.missing')),
      ).toBe(true);
    });

    it('does not warn for valid $store. reference', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: { files: { package: '@walkeros/server-store-fs' } },
              transformers: {
                t: {
                  package: '@walkeros/transformer-redact',
                  env: { store: '$store.files' },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.filter((w) => w.message.includes('$store.')),
      ).toHaveLength(0);
    });

    it('lists defined stores in the warning message', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: {
                cache: { package: '@walkeros/server-store-fs' },
                files: { package: '@walkeros/server-store-fs' },
              },
              transformers: {
                t: {
                  package: '@walkeros/transformer-redact',
                  env: { store: '$store.bogus' },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      const warning = result.warnings.find((w) =>
        w.message.includes('$store.bogus'),
      );
      expect(warning).toBeDefined();
      if (!warning) throw new Error('warning expected');
      expect(warning.message).toMatch(/cache/);
      expect(warning.message).toMatch(/files/);
    });
  });

  // --- $env. references ---

  describe('$env. references', () => {
    it('does not warn for valid $env.NAME', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: { config: { settings: { url: '$env.API_URL' } } },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.filter((w) => w.message.includes('$env.')),
      ).toHaveLength(0);
    });

    it('does not warn for valid $env.NAME:default', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: {
                  config: {
                    settings: { url: '$env.API_URL:https://default.test' },
                  },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.filter((w) => w.message.includes('$env.')),
      ).toHaveLength(0);
    });

    it('warns when $env. uses = instead of : for default value', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: {
                  config: { settings: { url: '$env.API_URL=fallback' } },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.some((w) => /\$env\.API_URL=fallback/.test(w.message)),
      ).toBe(true);
    });

    it('warns on lowercase env var name (convention)', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: { config: { settings: { url: '$env.apiUrl' } } },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.some(
          (w) =>
            /\$env\.apiUrl/.test(w.message) &&
            /uppercase|UPPER_SNAKE/i.test(w.message),
        ),
      ).toBe(true);
    });
  });

  // --- $flow. references ---

  describe('$flow. references', () => {
    it('warns when $flow.NAME references an undefined flow', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            web: {
              config: {
                platform: 'web',
                settings: { backend: '$flow.serverr.url' },
              },
            },
            server: {
              config: { platform: 'server', url: 'https://api.test' },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.some(
          (w) =>
            /\$flow\.serverr/.test(w.message) &&
            /Defined: web, server|Defined flows/.test(w.message),
        ),
      ).toBe(true);
    });

    it('does not warn for valid $flow.NAME reference', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            web: {
              config: {
                platform: 'web',
                settings: { backend: '$flow.server.url' },
              },
            },
            server: {
              config: { platform: 'server', url: 'https://api.test' },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.filter(
          (w) =>
            /Unknown flow/.test(w.message) ||
            /\$flow\.\w+ references undefined/.test(w.message),
        ),
      ).toHaveLength(0);
    });
  });

  // --- Colon-instead-of-dot typo detection ---

  describe('colon-instead-of-dot typo detection', () => {
    it('warns on $store:NAME and suggests $store.NAME', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: { files: { package: '@walkeros/server-store-fs' } },
              transformers: {
                t: {
                  package: '@walkeros/transformer-redact',
                  env: { store: '$store:files' },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      const warning = result.warnings.find((w) =>
        w.message.includes('$store:files'),
      );
      expect(warning).toBeDefined();
      if (!warning) throw new Error('warning expected');
      expect(warning.message).toMatch(/\$store\.files/);
      expect(warning.message).toMatch(/dot/i);
    });

    it('warns on $var:NAME and suggests $var.NAME', () => {
      const json = JSON.stringify(
        {
          version: 4,
          variables: { gaId: 'G-XXX' },
          flows: {
            default: {
              config: { platform: 'web' },
              destinations: {
                ga4: { config: { settings: { id: '$var:gaId' } } },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      const warning = result.warnings.find((w) =>
        w.message.includes('$var:gaId'),
      );
      expect(warning).toBeDefined();
      if (!warning) throw new Error('warning expected');
      expect(warning.message).toMatch(/\$var\.gaId/);
    });

    it('warns on $flow:NAME and suggests $flow.NAME', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            web: {
              config: { platform: 'web', settings: { url: '$flow:server' } },
            },
            server: {
              config: { platform: 'server', url: 'https://api.test' },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      const warning = result.warnings.find((w) =>
        w.message.includes('$flow:server'),
      );
      expect(warning).toBeDefined();
      if (!warning) throw new Error('warning expected');
      expect(warning.message).toMatch(/\$flow\.server/);
    });

    it('warns on $secret:NAME and suggests $secret.NAME', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: {
                  config: { settings: { token: '$secret:API_TOKEN' } },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      const warning = result.warnings.find((w) =>
        w.message.includes('$secret:API_TOKEN'),
      );
      expect(warning).toBeDefined();
      if (!warning) throw new Error('warning expected');
      expect(warning.message).toMatch(/\$secret\.API_TOKEN/);
    });

    it('does not warn on $code: prefix (legitimate colon usage)', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'web' },
              transformers: {
                t: { code: { push: '$code:(e) => e' } },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.filter((w) => /colon|dot/.test(w.message)),
      ).toHaveLength(0);
    });

    it('does not warn on $env.NAME:default (legitimate colon usage)', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: {
                  config: {
                    settings: { url: '$env.API_URL:https://default.test' },
                  },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.filter((w) =>
          /colon-instead-of-dot|use a dot/.test(w.message),
        ),
      ).toHaveLength(0);
    });
  });

  // --- store file/cache diagnostics ---

  describe('store file: true with cache', () => {
    it('warns when a store sets both file: true and cache', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: {
                assets: {
                  package: '@walkeros/server-store-fs',
                  config: { file: true },
                  cache: { rules: [{ ttl: 60 }] },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      const warning = result.warnings.find(
        (w) =>
          w.message.includes('"assets"') &&
          /file: true and cache/.test(w.message),
      );
      expect(warning).toBeDefined();
      if (!warning) throw new Error('warning expected');
      expect(warning.severity).toBe('warning');
      expect(warning.message).toMatch(/no benefit/);
    });

    it('does not warn when a store sets file: true without cache', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: {
                assets: {
                  package: '@walkeros/server-store-fs',
                  config: { file: true },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.filter((w) => /file: true and cache/.test(w.message)),
      ).toHaveLength(0);
    });

    it('does not warn when a store sets cache without file: true', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: {
                kv: {
                  package: '@walkeros/server-store-fs',
                  cache: { rules: [{ ttl: 60 }] },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.filter((w) => /file: true and cache/.test(w.message)),
      ).toHaveLength(0);
    });
  });

  describe('transformer-file wired to a non-file store', () => {
    it('warns when transformer-file points at a byte-native store without file: true', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: {
                assets: { package: '@walkeros/server-store-fs' },
              },
              transformers: {
                serve: {
                  package: '@walkeros/server-transformer-file',
                  env: { store: '$store.assets' },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      const warning = result.warnings.find(
        (w) =>
          w.message.includes('"assets"') &&
          /transformer-file serves byte-exact assets/.test(w.message),
      );
      expect(warning).toBeDefined();
      if (!warning) throw new Error('warning expected');
      expect(warning.severity).toBe('warning');
      expect(warning.message).toMatch(/config\.file: true/);
    });

    it('does not inform when transformer-file points at a store with file: true', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: {
                assets: {
                  package: '@walkeros/server-store-fs',
                  config: { file: true },
                },
              },
              transformers: {
                serve: {
                  package: '@walkeros/server-transformer-file',
                  env: { store: '$store.assets' },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings
          .concat(result.errors)
          .filter((i) =>
            /transformer-file serves byte-exact assets/.test(i.message),
          ),
      ).toHaveLength(0);
    });

    it('does not inform when a non-file-transformer points at a byte-native store', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: {
                assets: { package: '@walkeros/server-store-fs' },
              },
              transformers: {
                redact: {
                  package: '@walkeros/transformer-redact',
                  env: { store: '$store.assets' },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings
          .concat(result.errors)
          .filter((i) =>
            /transformer-file serves byte-exact assets/.test(i.message),
          ),
      ).toHaveLength(0);
    });

    it('does not warn when transformer-file points at a store with a missing/unknown package', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              stores: {
                assets: { config: {} },
                other: { package: '@walkeros/server-store-sheets' },
              },
              transformers: {
                serve: {
                  package: '@walkeros/server-transformer-file',
                  env: { store: '$store.assets' },
                },
                serve2: {
                  package: '@walkeros/server-transformer-file',
                  env: { store: '$store.other' },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings
          .concat(result.errors)
          .filter((i) =>
            /transformer-file serves byte-exact assets/.test(i.message),
          ),
      ).toHaveLength(0);
    });
  });

  // --- $secret. references ---

  describe('$secret. references', () => {
    it('errors when $secret. is used in a web flow', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'web' },
              destinations: {
                api: {
                  config: { settings: { token: '$secret.API_TOKEN' } },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(result.valid).toBe(false);
      const error = result.errors.find((e) =>
        e.message.includes('$secret.API_TOKEN'),
      );
      expect(error).toBeDefined();
      if (!error) throw new Error('error expected');
      expect(error.severity).toBe('error');
      expect(error.message).toMatch(/web flow/);
      expect(error.line).toBeGreaterThan(0);
    });

    it('does not error for $secret. in a server flow', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: {
                  config: { settings: { token: '$secret.API_TOKEN' } },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.errors.filter((e) => e.message.includes('$secret.')),
      ).toHaveLength(0);
    });

    it('does not error for $secret. in the server flow of a multi-flow config (web flow first)', () => {
      // A valid web -> server forwarding config: the web flow holds no secret,
      // the server flow holds the secret. The secret check must scope per flow,
      // not flag the server secret just because a web flow appears first.
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            web: {
              config: { platform: 'web' },
              destinations: {
                api: {
                  config: { settings: { url: '$flow.ingest.url' } },
                },
              },
            },
            ingest: {
              config: { platform: 'server' },
              destinations: {
                bq: {
                  config: { settings: { projectId: '$secret.GCP_PROJECT_ID' } },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.errors.filter((e) => e.message.includes('$secret.')),
      ).toHaveLength(0);
      expect(result.valid).toBe(true);
    });

    it('still errors for $secret. in the web flow of a multi-flow config', () => {
      // The protection must survive per-flow scoping: a secret in the WEB flow
      // is still a hard error even when a server flow is present.
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            web: {
              config: { platform: 'web' },
              destinations: {
                api: {
                  config: { settings: { token: '$secret.LEAKED' } },
                },
              },
            },
            ingest: {
              config: { platform: 'server' },
              destinations: {
                bq: {
                  config: { settings: { projectId: '$secret.GCP_PROJECT_ID' } },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(result.valid).toBe(false);
      const leaked = result.errors.find((e) =>
        e.message.includes('$secret.LEAKED'),
      );
      expect(leaked).toBeDefined();
      // The server flow's secret must NOT be flagged.
      expect(
        result.errors.find((e) => e.message.includes('$secret.GCP_PROJECT_ID')),
      ).toBeUndefined();
    });

    it('warns when $secret. references a name not in the known set', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: {
                  config: { settings: { token: '$secret.UNKNOWN' } },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json, { secrets: ['API_TOKEN'] });
      const warning = result.warnings.find((w) =>
        w.message.includes('$secret.UNKNOWN'),
      );
      expect(warning).toBeDefined();
      if (!warning) throw new Error('warning expected');
      expect(warning.severity).toBe('warning');
      expect(warning.message).toMatch(/registered secrets/);
    });

    it('does not warn for a known $secret. name in a server flow', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: {
                  config: { settings: { token: '$secret.API_TOKEN' } },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json, { secrets: ['API_TOKEN'] });
      expect(
        result.warnings.filter((w) => w.message.includes('$secret.')),
      ).toHaveLength(0);
      expect(
        result.errors.filter((e) => e.message.includes('$secret.')),
      ).toHaveLength(0);
    });

    it('does not warn for unknown $secret. name when no known set is provided', () => {
      const json = JSON.stringify(
        {
          version: 4,
          flows: {
            default: {
              config: { platform: 'server' },
              destinations: {
                api: {
                  config: { settings: { token: '$secret.WHATEVER' } },
                },
              },
            },
          },
        },
        null,
        2,
      );
      const result = validateFlowConfig(json);
      expect(
        result.warnings.filter((w) => w.message.includes('$secret.')),
      ).toHaveLength(0);
    });
  });
  describe('resolution roots', () => {
    function flowWith(steps: Record<string, unknown>): string {
      return JSON.stringify(
        {
          version: 4,
          flows: { default: { config: { platform: 'server' }, ...steps } },
        },
        null,
        2,
      );
    }

    function destination(config: Record<string, unknown>) {
      return { destinations: { d: { package: '@walkeros/x', config } } };
    }

    function rootErrorPaths(steps: Record<string, unknown>): string[] {
      return validateFlowConfig(flowWith(steps))
        .errors.filter((e) => /resolve/.test(e.message))
        .map((e) => e.path ?? '');
    }

    it.each([
      [
        'ingest in destination data',
        destination({ data: { map: { site: 'ingest.site' } } }),
        'flows.default.destinations.d.config.data.map.site',
      ],
      [
        'ingest in a loop scope',
        destination({
          data: { loop: ['ingest.items', { map: { id: 'id' } }] },
        }),
        'flows.default.destinations.d.config.data.loop.0',
      ],
      [
        'ingest in a policy',
        destination({ policy: { 'data.site': 'ingest.site' } }),
        'flows.default.destinations.d.config.policy.data.site',
      ],
      [
        'ingest in a mapping rule',
        destination({ mapping: { page: { view: { data: 'ingest.site' } } } }),
        'flows.default.destinations.d.config.mapping.page.view.data',
      ],
      [
        'a bare cache key',
        {
          transformers: {
            t: { cache: { rules: [{ key: ['data.id'], ttl: 60 }] } },
          },
        },
        'flows.default.transformers.t.cache.rules.0.key.0',
      ],
      [
        'a bare route match',
        {
          sources: {
            s: {
              package: '@walkeros/x',
              next: {
                one: [
                  {
                    match: {
                      and: [{ key: 'data.id', operator: 'exists', value: '' }],
                    },
                    next: 'a',
                  },
                  'b',
                ],
              },
            },
          },
        },
        'flows.default.sources.s.next.one.0.match.and.0.key',
      ],
      [
        'an entry match around a nested gate',
        {
          transformers: {
            t: {
              next: {
                one: [
                  {
                    match: { key: 'data.id', operator: 'exists', value: '' },
                    next: {
                      match: {
                        key: 'event.name',
                        operator: 'exists',
                        value: '',
                      },
                      next: 'a',
                    },
                  },
                ],
              },
            },
          },
        },
        'flows.default.transformers.t.next.one.0.match.key',
      ],
      [
        'a gated stop',
        {
          destinations: {
            d: {
              package: '@walkeros/x',
              before: [
                'a',
                {
                  match: { key: 'name', operator: 'eq', value: 'x' },
                  stop: true,
                },
              ],
            },
          },
        },
        'flows.default.destinations.d.before.1.match.key',
      ],
      [
        'a collector.next match',
        {
          collector: {
            next: {
              many: [
                {
                  match: { key: 'data.id', operator: 'exists', value: '' },
                  next: 'a',
                },
                'b',
              ],
            },
          },
        },
        'flows.default.collector.next.many.0.match.key',
      ],
    ])('flags %s', (_, steps, path) => {
      expect(rootErrorPaths(steps)).toEqual([path]);
    });

    it.each([
      [
        'ingest inside a loop body, which resolves against each item',
        destination({
          data: { loop: ['nested', { map: { v: 'ingest.x' } }] },
        }),
      ],
      [
        'a nested loop inside a map',
        destination({
          data: {
            map: {
              items: {
                loop: ['nested', { loop: ['this', { key: 'ingest.x' }] }],
              },
            },
          },
        }),
      ],
      [
        'bare event paths in destination data',
        destination({ data: { map: { v: 'data.total' } } }),
      ],
      [
        'a reference string',
        destination({ data: { map: { v: '$var.currency' } } }),
      ],
      [
        'a whole-root route match',
        {
          destinations: {
            d: {
              package: '@walkeros/x',
              before: {
                match: { key: 'event', operator: 'exists', value: '' },
                next: 't',
              },
            },
          },
        },
      ],
      [
        'event.name in a cache key',
        {
          transformers: {
            t: { cache: { rules: [{ key: ['event.name'], ttl: 60 }] } },
          },
        },
      ],
      [
        'cache.status in a cache update',
        {
          sources: {
            s: {
              package: '@walkeros/x',
              cache: {
                rules: [
                  {
                    key: ['ingest.path'],
                    ttl: 60,
                    update: { 'headers.X-Cache': { key: 'cache.status' } },
                  },
                ],
              },
            },
          },
        },
      ],
    ])('does not flag %s', (_, steps) => {
      expect(rootErrorPaths(steps)).toEqual([]);
    });

    it('flags a bare state key through the schema', () => {
      const result = validateFlowConfig(
        flowWith({
          transformers: {
            t: {
              state: { mode: 'get', key: 'user.id', value: 'event.data.x' },
            },
          },
        }),
      );
      expect(
        result.errors.some((e) =>
          e.message.includes('needs an "event." or "ingest." prefix'),
        ),
      ).toBe(true);
    });
  });

  describe('whole-value references', () => {
    function flowWithSetting(settings: Record<string, unknown>): unknown {
      return {
        version: 4,
        flows: {
          web: {
            config: { platform: 'web' },
            destinations: {
              api: {
                package: '@walkeros/web-destination-api',
                config: { settings },
              },
            },
          },
          server: {
            config: { platform: 'server', url: 'https://collect.example' },
          },
        },
        contract: { web: { events: {} } },
      };
    }

    it.each([
      // Starts with the prefix, so it is a grammar miss, not an inline use.
      ['$flow.server.url/collect', 'grammar'],
      ['https://x/$store.cache', 'inline'],
      ['Bearer $secret.API_KEY', 'inline'],
      ['see $contract.web', 'inline'],
      ['$secret.api_key', 'grammar'],
      ['$store.cache.key', 'grammar'],
      ['$flow.server.settings.my-key', 'grammar'],
    ])('warns on %s (%s)', (value, kind) => {
      const result = validateFlowConfig(
        JSON.stringify(flowWithSetting({ url: value }), null, 2),
      );
      const text =
        kind === 'inline'
          ? 'resolve only as the whole value'
          : 'does not match the';
      const warning = result.warnings.find((w) => w.message.includes(text));
      expect(warning).toBeDefined();
      expect(warning?.path).toBe(
        'flows.web.destinations.api.config.settings.url',
      );
      expect(warning?.line).toBeGreaterThan(1);
    });

    it('points a longer $flow string at $var or $env composition', () => {
      const result = validateFlowConfig(
        JSON.stringify(
          flowWithSetting({ url: '$flow.server.url/collect' }),
          null,
          2,
        ),
      );
      expect(
        result.warnings.some((w) =>
          w.message.includes(
            'To build a longer string, compose with $var or $env.',
          ),
        ),
      ).toBe(true);
    });

    it('does not warn on prose that mentions a reference', () => {
      const result = validateFlowConfig(
        JSON.stringify(
          {
            version: 4,
            flows: {
              web: {
                config: { platform: 'web' },
                destinations: {
                  api: {
                    package: '@walkeros/web-destination-api',
                    config: { settings: { url: '$flow.server.url' } },
                    examples: {
                      page: {
                        title: 'Uses $flow.server.url/collect',
                        description:
                          'Points at $flow.server.url/collect for the collect path',
                        in: { name: 'page view' },
                      },
                    },
                  },
                },
              },
              server: {
                config: { platform: 'server', url: 'https://collect.example' },
              },
            },
          },
          null,
          2,
        ),
      );
      expect(result.errors).toEqual([]);
      expect(
        result.warnings.some((w) =>
          /whole value|does not match the/.test(w.message),
        ),
      ).toBe(false);
    });

    it.each([
      ['$flow.server.url'],
      ['$secret.API_KEY'],
      ['https://$env.HOST:x.example/collect'],
      ['$var.base/collect'],
      ['$code:(e) => "$flow.x"'],
    ])('does not warn on %s', (value) => {
      const result = validateFlowConfig(
        JSON.stringify(flowWithSetting({ url: value }), null, 2),
      );
      expect(
        result.warnings.some((w) =>
          /whole value|does not match the/.test(w.message),
        ),
      ).toBe(false);
    });

    it('skips $secret mentions in prose fields of a web flow', () => {
      const config = {
        version: 4,
        flows: {
          web: {
            config: { platform: 'web' },
            destinations: {
              api: {
                package: '@walkeros/web-destination-api',
                description:
                  'The server flow reads $secret.api_key, never here.',
                config: { settings: { url: 'https://collect.example' } },
                examples: {
                  hit: {
                    title: 'Uses $secret.API_TOKEN on the server',
                    $comment: 'see $secret.API_TOKEN',
                    in: { name: 'page view' },
                  },
                },
              },
            },
          },
        },
      };
      const result = validateFlowConfig(JSON.stringify(config, null, 2));
      expect(
        result.errors.filter((e) => e.message.includes('$secret')),
      ).toEqual([]);
    });

    describe('prose skip applies only where prose lives', () => {
      const bad = '$store.x.y';
      function flowWith(overrides: {
        mapping?: Record<string, unknown>;
        settings?: Record<string, unknown>;
        step?: Record<string, unknown>;
        example?: Record<string, unknown>;
        flow?: Record<string, unknown>;
        root?: Record<string, unknown>;
      }): string {
        return JSON.stringify(
          {
            version: 4,
            ...overrides.root,
            flows: {
              web: {
                config: { platform: 'web' },
                ...overrides.flow,
                destinations: {
                  api: {
                    package: '@walkeros/web-destination-api',
                    ...overrides.step,
                    config: {
                      settings: {
                        url: 'https://c.example',
                        ...overrides.settings,
                      },
                      mapping: overrides.mapping ?? {},
                    },
                    examples: {
                      hit: { in: { name: 'page view' }, ...overrides.example },
                    },
                  },
                },
              },
            },
            contract: {
              web: {
                events: {
                  page: {
                    view: {
                      type: 'object',
                      description: 'Read from $store.x.y',
                      properties: {
                        title: { type: 'string', description: bad },
                      },
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        );
      }
      const warned = (json: string) =>
        validateFlowConfig(json).warnings.some((w) =>
          /whole value|does not match the/.test(w.message),
        );

      it.each([
        [
          'a mapping title value',
          { mapping: { page: { view: { data: { map: { title: bad } } } } } },
        ],
        [
          'a mapping description',
          { mapping: { page: { view: { description: bad } } } },
        ],
        [
          'a description key deep in mapping data',
          {
            mapping: {
              page: { view: { data: { map: { description: bad } } } },
            },
          },
        ],
        ['a settings description', { settings: { description: bad } }],
        ['a settings title', { settings: { title: bad } }],
      ])('checks %s', (_label, overrides) => {
        expect(warned(flowWith(overrides))).toBe(true);
      });

      it.each([
        [
          'a mapping $comment',
          { mapping: { page: { view: { $comment: bad } } } },
        ],
        ['a settings $comment', { settings: { $comment: bad } }],
        ['a step title', { step: { title: bad } }],
        ['a step description', { step: { description: bad } }],
        ['an example title', { example: { title: bad } }],
        ['an example description', { example: { description: bad } }],
        ['a flow description', { flow: { description: bad } }],
        ['a root title', { root: { title: bad } }],
        ['nothing but the contract', {}],
      ])('skips %s', (_label, overrides) => {
        expect(warned(flowWith(overrides))).toBe(false);
      });

      it('skips a step settings.contract schema but checks settings.title', () => {
        const contract = {
          type: 'object',
          description: 'Read from $store.x.y',
          properties: { id: { type: 'string', description: bad } },
        };
        expect(warned(flowWith({ settings: { contract } }))).toBe(false);
        expect(warned(flowWith({ settings: { contract, title: bad } }))).toBe(
          true,
        );
      });

      it('checks a $secret in a settings description of a web flow', () => {
        const result = validateFlowConfig(
          flowWith({ settings: { description: '$secret.API_KEY' } }),
        );
        expect(
          result.errors.some((e) => e.message.includes('$secret.API_KEY')),
        ).toBe(true);
      });
    });

    it('reports a lowercase $secret name in a web flow', () => {
      const result = validateFlowConfig(
        JSON.stringify(flowWithSetting({ token: '$secret.api_key' }), null, 2),
      );
      expect(
        result.errors.some((e) => e.message.includes('$secret.api_key')),
      ).toBe(true);
    });
  });
});
