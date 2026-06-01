import { InitSourceSchema, initSourceJsonSchema } from '../source';

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
