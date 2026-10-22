import { validateFlowStructure } from '../validate-structure';
import type { Flow } from '../types/flow';

function flow(flows: Record<string, Flow>): Flow.Json {
  return { version: 4, flows };
}

describe('validateFlowStructure', () => {
  it('accepts a valid single-flow config', () => {
    const config = flow({
      default: {
        config: { platform: 'web' },
        sources: {
          browser: { package: '@walkeros/web-source-browser' },
        },
        destinations: {
          gtag: { package: '@walkeros/web-destination-gtag' },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(true);
    expect(result.type).toBe('flow');
    expect(result.errors).toEqual([]);
    expect(result.details.flowNames).toEqual(['default']);
  });

  it('rejects a config with no flows', () => {
    const result = validateFlowStructure(flow({}));

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('EMPTY_FLOWS');
  });

  it('flags a component name that is not a valid JS identifier', () => {
    const config = flow({
      default: {
        config: { platform: 'web' },
        destinations: {
          'gtag-wrapper': { package: '@walkeros/web-destination-gtag' },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === 'INVALID_COMPONENT_NAME',
    );
    expect(error).toBeDefined();
    expect(error?.path).toBe('flows.default.destinations');
    expect(error?.message).toMatch(/valid JavaScript identifier/);
  });

  it('flags a source with neither package nor code', () => {
    const config = flow({
      default: {
        config: { platform: 'web' },
        sources: {
          browser: {},
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find((e) => e.code === 'INVALID_REFERENCE');
    expect(error).toBeDefined();
    expect(error?.path).toBe('flows.default.sources.browser');
    expect(error?.message).toMatch(/Must specify either package or code/);
  });

  it('reports every dangling $store. reference, not just the first', () => {
    const config = flow({
      default: {
        config: { platform: 'server' },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { token: '$store.alpha', extra: '$store.beta' },
          },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === 'STORE_REFERENCE_NOT_FOUND',
    );
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/alpha/);
    expect(error?.message).toMatch(/beta/);
  });

  it('flags a dangling $store. reference', () => {
    const config = flow({
      default: {
        config: { platform: 'server' },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { token: '$store.missing' },
          },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === 'STORE_REFERENCE_NOT_FOUND',
    );
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/store "missing" not found/);
  });

  it('accepts a $store. reference that resolves to a defined store', () => {
    const config = flow({
      default: {
        config: { platform: 'server' },
        stores: {
          secrets: { package: '@walkeros/server-store-memory' },
        },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { settings: { token: '$store.secrets' } },
          },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags a transformer entry that sets both code and package via the closed schema', () => {
    const config = flow({
      default: {
        config: { platform: 'web' },
        transformers: {
          // Setting both `code` and `package` is a closed-schema CONFLICT.
          enrich: {
            package: '@walkeros/transformer-noop',
            code: { push: '$code:(event) => event' },
          },
        },
      },
    });

    const result = validateFlowStructure(config);

    expect(result.valid).toBe(false);
    const error = result.errors.find((e) => e.code === 'CONFLICT');
    expect(error).toBeDefined();
    expect(error?.path).toBe('flows.default.transformers.enrich');
  });

  it('rejects a transformer mapping that never runs or does nothing (MAPPING_NO_OP)', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'web' },
          transformers: {
            packaged: {
              package: '@walkeros/transformer-noop',
              mapping: { policy: { 'user.id': { value: 'x' } } },
            },
            shaped: {
              config: {
                mapping: {
                  mapping: { order: { complete: [{ consent: { a: true } }] } },
                },
              },
            },
            clean: {
              mapping: { mapping: { page: { view: { name: 'pv' } } } },
            },
          },
        },
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([
      {
        path: 'flows.default.transformers.packaged',
        message:
          '`mapping` is ignored: a transformer with `package` never runs it; a mapping applies only to a transformer without code.',
        code: 'MAPPING_NO_OP',
      },
      {
        path: 'flows.default.transformers.shaped',
        message:
          "`config.mapping.mapping.order.complete[0].consent` does nothing at the transformer position; only `policy` and a rule's `condition`, `policy`, `name` and `ignore` apply.",
        code: 'MAPPING_NO_OP',
      },
    ]);
  });

  it('rejects a step-level mapping that config.mapping overrides', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'web' },
          transformers: {
            both: {
              mapping: { policy: { 'user.id': { value: 'x' } } },
              config: {
                mapping: { policy: { 'user.email': { value: '' } } },
              },
            },
          },
        },
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        path: 'flows.default.transformers.both',
        message: '`mapping` is overridden: `config.mapping` wins; remove one.',
        code: 'MAPPING_NO_OP',
      },
    ]);
  });

  it('names both mappings a transformer with a package ignores', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'web' },
          transformers: {
            packaged: {
              package: '@walkeros/transformer-noop',
              mapping: { policy: { 'user.id': { value: 'x' } } },
              config: {
                mapping: { policy: { 'user.email': { value: '' } } },
              },
            },
          },
        },
      }),
    );

    expect(result.errors).toEqual([
      {
        path: 'flows.default.transformers.packaged',
        message:
          '`config.mapping` and `mapping` are ignored: a transformer with `package` never runs them; a mapping applies only to a transformer without code.',
        code: 'MAPPING_NO_OP',
      },
    ]);
  });

  it('runs synchronously and returns without building', () => {
    // Synchronous: the return value is a plain object, not a Promise.
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'web' },
          sources: { browser: { package: '@walkeros/web-source-browser' } },
        },
      }),
    );

    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof result.valid).toBe('boolean');
  });
});

describe('closed schemas (validate and the bundle preflight)', () => {
  const code = {
    type: 'd',
    init: '$code:() => {}',
    push: '$code:(event) => {}',
  };
  const codes = (config: Flow.Json) =>
    validateFlowStructure(config).errors.map((error) => [
      error.code,
      error.path,
    ]);

  it('rejects unknown keys in a step config and on a destination (E1)', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'web' },
          destinations: {
            console: {
              code,
              config: {
                queueMaxx: 5,
                consentt: { marketing: true },
                mappingg: { page: { view: { name: 'pv' } } },
              },
            },
          },
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual([
      'flows.default.destinations.console.config.queueMaxx',
      'flows.default.destinations.console.config.consentt',
      'flows.default.destinations.console.config.mappingg',
    ]);
    expect(result.errors[1]).toMatchObject({
      code: 'UNKNOWN_KEY',
      message: expect.stringContaining(
        'Unknown key "consentt" in Destination config is ignored by the runtime. Known keys:',
      ),
    });
    expect(result.errors[1].message).toContain(' consent,');
  });

  it.each([
    ['sources', { code, config: { primaryy: true } }, 'config.primaryy'],
    ['transformers', { code, config: { nextt: 'x' } }, 'config.nextt'],
    ['stores', { code, config: { fil: true } }, 'config.fil'],
    ['stores', { code, settings: {} }, 'settings'],
  ])('rejects an unknown key on %s at %s', (section, step, key) => {
    expect(
      codes(
        flow({
          default: { config: { platform: 'web' }, [section]: { s: step } },
        }),
      ),
    ).toContainEqual(['UNKNOWN_KEY', `flows.default.${section}.s.${key}`]);
  });

  it('knows collector.consentDenied and rejects an unknown collector key', () => {
    // As read from a file: the typo is not a typed key.
    const file: Flow.Json = JSON.parse(
      JSON.stringify({
        version: 4,
        flows: {
          default: {
            config: { platform: 'server' },
            collector: { consentDenied: 'skip', queueMaxx: 1 },
          },
        },
      }),
    );
    expect(codes(file)).toEqual([
      ['UNKNOWN_KEY', 'flows.default.collector.queueMaxx'],
    ]);
  });

  it('accepts every known config key', () => {
    expect(
      validateFlowStructure(
        flow({
          default: {
            config: { platform: 'web' },
            destinations: {
              d: {
                code,
                config: {
                  consent: { marketing: true },
                  settings: { any: 'thing' },
                  queueMax: 5,
                  batch: { size: 10 },
                },
              },
            },
          },
        }),
      ).errors,
    ).toEqual(
      [['flows.default.destinations.d', 'BATCH_WITHOUT_PUSH_BATCH']].map(
        ([path, code]) => expect.objectContaining({ path, code }),
      ),
    );
  });

  it('rejects a batch on inline code without pushBatch (E3)', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'web' },
          destinations: {
            d: {
              code,
              config: {
                batch: 10,
                mapping: { page: { view: [{ batch: 5 }] } },
              },
            },
            batched: {
              code: { ...code, pushBatch: '$code:(batch) => {}' },
              config: { batch: 10 },
            },
          },
        },
      }),
    );
    expect(result.errors).toEqual([
      {
        path: 'flows.default.destinations.d',
        message:
          '`config.batch`, `config.mapping.page.view[0].batch` have no effect: the inline code has no `pushBatch`, so events go to `push` one by one. Add a `pushBatch` function to `code`, or remove the batch.',
        code: 'BATCH_WITHOUT_PUSH_BATCH',
      },
    ]);
  });

  it('rejects a mapping value with key and fn (E7)', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'web' },
          destinations: {
            d: {
              code,
              config: {
                mapping: {
                  page: {
                    view: {
                      data: {
                        map: {
                          title: {
                            key: 'data.title',
                            fn: '$code:(v) => String(v).toUpperCase()',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    );
    expect(result.errors).toEqual([
      {
        path: 'flows.default.destinations.d.config.mapping.page.view.data.map.title',
        message:
          "`fn` never runs: `key` is this value's producer (one producer per value, tried in the order loop, map, set, key, fn). Keep one producer; to transform a path, read it inside `fn`.",
        code: 'MAPPING_VALUE_PRODUCERS',
      },
    ]);
  });

  it('rejects a mapping object without an operator (E14), also in a source ingest', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'server' },
          sources: {
            s: { code, config: { ingest: { url: 'url', ip: 'ip' } } },
          },
          destinations: {
            rec: {
              code,
              config: {
                data: { total: 'data.total', currency: 'data.currency' },
                policy: { 'data.id': { map: { id: 'data.id' } } },
              },
            },
          },
        },
      }),
    );
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: 'flows.default.sources.s.config.ingest',
        code: 'MAPPING_VALUE_NO_OPERATOR',
      }),
      {
        path: 'flows.default.destinations.rec.config.data',
        message:
          'Mapping value has no operator (total, currency), so it is dropped at runtime. Wrap the fields in map ({ "map": { ... } }), or use key, value, fn, loop or set.',
        code: 'MAPPING_VALUE_NO_OPERATOR',
      },
    ]);
  });

  it('rejects mapping keys that do nothing at the source and destination position (E24, E25)', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          config: { platform: 'web' },
          sources: {
            s: {
              code,
              config: {
                mapping: { page: { view: { data: { map: { a: 'data.a' } } } } },
              },
            },
          },
          destinations: {
            d: {
              code,
              config: {
                mapping: { page: { view: { extend: { name: 'x' } } } },
              },
            },
          },
          transformers: {
            t: { mapping: { mapping: { page: { view: { silent: true } } } } },
          },
        },
      }),
    );
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([
      {
        path: 'flows.default.transformers.t',
        message:
          "`mapping.mapping.page.view.silent` does nothing at the transformer position; only `policy` and a rule's `condition`, `policy`, `name` and `ignore` apply.",
        code: 'MAPPING_NO_OP',
      },
      {
        path: 'flows.default.sources.s',
        message:
          "`config.mapping.page.view.data` does nothing at the source position; only `consent`, `policy` and a rule's `condition`, `policy`, `name` and `ignore` apply; edit the event at a source with `policy`.",
        code: 'MAPPING_NO_OP',
      },
      {
        path: 'flows.default.destinations.d',
        message:
          "`config.mapping.page.view.extend` does nothing at the destination position; a rule's `extend` applies only inside a package's own `settings.mapping` (today `@walkeros/transformer-ga4`), merged onto its shipped rules; write the fields on the rule itself.",
        code: 'MAPPING_NO_OP',
      },
    ]);
  });

  it.each([
    ['$flow. tracking-server.url', 'does not match the $flow.NAME grammar'],
    ['$flow.1st.url', 'does not match the $flow.NAME grammar'],
    ['https://$flow.web.url/e', 'uses $flow. inline'],
    ['$store.cache.key', 'does not match the $store.NAME grammar'],
    ['Bearer $secret.API_KEY', 'uses $secret. inline'],
    ['see $contract.web', 'uses $contract. inline'],
  ])('rejects the malformed reference %s (E26)', (url, text) => {
    const result = validateFlowStructure(
      flow({
        'tracking-server': {
          config: { platform: 'server', url: 'https://collect.example.com' },
        },
        web: {
          config: { platform: 'web' },
          destinations: { api: { code, config: { settings: { url } } } },
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: 'flows.web.destinations.api.config.settings.url',
      message: expect.stringContaining(text),
      code: 'MALFORMED_REFERENCE',
    });
  });

  it('accepts a valid hyphenated $flow reference', () => {
    expect(
      validateFlowStructure(
        flow({
          'tracking-server': {
            config: { platform: 'server', url: 'https://collect.example.com' },
          },
          web: {
            config: { platform: 'web' },
            destinations: {
              api: {
                code,
                config: { settings: { url: '$flow.tracking-server.url' } },
              },
            },
          },
        }),
      ).errors,
    ).toEqual([]);
  });
});

describe('state store references', () => {
  const entry = (store?: string) => ({
    mode: 'get' as const,
    ...(store === undefined ? {} : { store }),
    key: 'event.user.id',
    value: 'event.user.ltv',
  });

  const stateCodes = (config: Flow.Json) =>
    validateFlowStructure(config).errors.filter((error) =>
      error.code?.startsWith('STATE_STORE_'),
    );

  it('STATE_STORE_UNKNOWN when state.store is not declared', () => {
    const result = validateFlowStructure(
      flow({
        default: {
          transformers: {
            loadUser: {
              package: '@walkeros/transformer-noop',
              state: entry('customers'),
            },
          },
        },
      }),
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.filter((error) => error.code?.startsWith('STATE_STORE_')),
    ).toEqual([
      expect.objectContaining({
        code: 'STATE_STORE_UNKNOWN',
        path: 'flows.default.transformers.loadUser.state',
      }),
    ]);
  });

  it('a declared store passes', () => {
    expect(
      stateCodes(
        flow({
          default: {
            stores: { customers: { package: '@walkeros/server-store-fs' } },
            transformers: {
              loadUser: {
                package: '@walkeros/transformer-noop',
                state: entry('customers'),
              },
            },
          },
        }),
      ),
    ).toEqual([]);
  });

  it('an omitted store, an explicit __cache and a $ reference pass', () => {
    expect(
      stateCodes(
        flow({
          default: {
            transformers: {
              loadUser: {
                package: '@walkeros/transformer-noop',
                state: [entry(), entry('__cache'), entry('$var.store')],
              },
            },
          },
        }),
      ),
    ).toEqual([]);
  });

  it('STATE_STORE_FILE when the store sets file: true', () => {
    const errors = stateCodes(
      flow({
        default: {
          stores: {
            customers: {
              package: '@walkeros/server-store-fs',
              config: { file: true },
            },
          },
          transformers: {
            loadUser: {
              package: '@walkeros/transformer-noop',
              state: entry('customers'),
            },
          },
        },
      }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('STATE_STORE_FILE');
  });

  it('config.state is scanned too', () => {
    const errors = stateCodes(
      flow({
        default: {
          destinations: {
            api: {
              package: '@walkeros/server-destination-api',
              config: { state: entry('customers') },
            },
          },
        },
      }),
    );

    expect(errors.map((error) => error.path)).toEqual([
      'flows.default.destinations.api.config.state',
    ]);
  });

  it('every array entry is scanned, the index is in the path', () => {
    const errors = stateCodes(
      flow({
        default: {
          stores: { customers: { package: '@walkeros/server-store-fs' } },
          transformers: {
            loadUser: {
              package: '@walkeros/transformer-noop',
              state: [entry('customers'), entry('profiles')],
            },
          },
        },
      }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].path).toMatch(/\.state\.1$/);
  });
});
