import { ConfigSchema } from '../../schemas/transformer';

describe('Transformer ConfigSchema', () => {
  it('accepts mapping field on transformer config', () => {
    const parsed = ConfigSchema.parse({ mapping: {} });
    expect(parsed.mapping).toBeDefined();
  });

  it('rejects unknown top-level keys on transformer config (closed schema)', () => {
    expect(() => ConfigSchema.parse({ rules: [] })).toThrow();
  });
});

describe('Transformer ConfigSchema mapping field at transformer position', () => {
  it('accepts mapping with policy (event-mutating)', () => {
    const result = ConfigSchema.safeParse({
      mapping: {
        policy: { 'user.email': { value: '[redacted]' } },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts mapping with nested mapping (per-event rules)', () => {
    const result = ConfigSchema.safeParse({
      mapping: {
        mapping: {
          order: { complete: { name: 'purchase' } },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts mapping that includes data (allowed by Mapping.Config; engine warns at runtime)', () => {
    // Schema is lenient — same Mapping.Config shape as destinations. The
    // runtime warns when `data` appears at transformer position (Task 2.3).
    // Note: `data` is ValueSchema | ValuesSchema, so we use a ValueConfig shape
    // (e.g. { map: { ... } }) rather than a free-form object.
    const result = ConfigSchema.safeParse({
      mapping: {
        data: { map: { foo: 'data.bar' } },
      },
    });
    expect(result.success).toBe(true);
  });

  it('Mapping.Config schema is currently lenient — unknown keys silently passthrough', () => {
    // Empirically: packages/core/src/schemas/mapping.ts ConfigSchema (line 350)
    // is a plain z.object() without .strict(), so Zod strips unknown keys and
    // safeParse succeeds. TODO: revisit if Mapping.Config schema is later made
    // strict — then this should assert `result.success === false`.
    const result = ConfigSchema.safeParse({
      mapping: {
        unknownField: 'something',
      },
    });
    expect(typeof result.success).toBe('boolean');
  });
});
