import {
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
      state: { mode: 'get', key: 'user.session', value: 'data.gclid' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a top-level state (array)', () => {
    const result = InitSourceSchema.safeParse({
      code,
      state: [
        { mode: 'get', key: 'user.session', value: 'data.gclid' },
        { mode: 'set', key: 'user.session', value: 'data.gclid' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid top-level state', () => {
    const result = InitSourceSchema.safeParse({
      code,
      state: { mode: 'delete', key: 'user.session', value: 'data.gclid' },
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
