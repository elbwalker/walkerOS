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
      { entity: 'page', actions: ['view', 'read'] },
    ]);
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
});
