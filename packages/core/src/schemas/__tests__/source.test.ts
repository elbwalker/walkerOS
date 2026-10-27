import {
  configJsonSchema,
  InitSourceSchema,
  initSourceJsonSchema,
  PartialConfigSchema,
} from '../source';

interface JsonNode {
  properties?: Record<string, unknown>;
  definitions?: Record<string, JsonNode>;
}

describe('InitSourceSchema', () => {
  const code = () => ({ type: 'test', config: {}, push: () => undefined });

  it('accepts a top-level state (single)', () => {
    const result = InitSourceSchema.safeParse({
      code,
      state: {
        mode: 'get',
        key: 'event.user.session',
        value: 'event.data.gclid',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a top-level state (array)', () => {
    const result = InitSourceSchema.safeParse({
      code,
      state: [
        { mode: 'get', key: 'event.user.session', value: 'event.data.gclid' },
        { mode: 'set', key: 'event.user.session', value: 'event.data.gclid' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid top-level state', () => {
    const result = InitSourceSchema.safeParse({
      code,
      state: {
        mode: 'delete',
        key: 'event.user.session',
        value: 'event.data.gclid',
      },
    });
    expect(result.success).toBe(false);
  });

  it('exposes state on the InitSource JSON schema', () => {
    const json: JsonNode = initSourceJsonSchema;
    const def = json.definitions?.SourceInitSource;
    expect(def).toBeDefined();
    expect(def?.properties?.state).toBeDefined();
  });
});

describe('Source.Config async', () => {
  it.each([[true], [false]])('accepts boolean async %p', (value) => {
    const result = PartialConfigSchema.safeParse({ async: value });
    expect(result.success).toBe(true);
  });

  it('accepts a per-method record', () => {
    const result = PartialConfigSchema.safeParse({
      async: { GET: false, POST: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-boolean record value', () => {
    const result = PartialConfigSchema.safeParse({ async: { GET: 'yes' } });
    expect(result.success).toBe(false);
  });
});

// These descriptions render in the sources docs and in MCP: they must say what
// the collector does. `require` delays only on() deliveries, setup runs only
// on `walkeros setup`, and ingest resolves against the normalized scope.
describe('Source.Config descriptions', () => {
  it.each([
    [
      'require',
      /^Collector events .* before the source receives on\(\) calls; init and event capture are not delayed/,
    ],
    [
      'setup',
      /^Provisioning options for `walkeros setup`, which runs only when invoked/,
    ],
    ['ingest', /resolves against the normalized request scope/],
  ])('describes %s by its behaviour', (key, pattern) => {
    expect(configJsonSchema).toMatchObject({
      definitions: {
        SourceConfig: {
          properties: {
            [key]: { description: expect.stringMatching(pattern) },
          },
        },
      },
    });
  });
});
