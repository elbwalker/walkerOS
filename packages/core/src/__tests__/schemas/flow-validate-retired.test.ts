import {
  SourceSchema,
  TransformerSchema,
  DestinationSchema,
} from '../../schemas/flow';

describe('retired per-step validate field', () => {
  // SourceSchema is strict: unknown keys, including the retired `validate`,
  // are rejected loudly rather than stripped.
  it('Source: rejects a top-level validate field', () => {
    const result = SourceSchema.safeParse({
      package: '@walkeros/x',
      validate: { format: true },
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ['Transformer', TransformerSchema],
    ['Destination', DestinationSchema],
  ] as const)('%s: strips a top-level validate field', (_name, schema) => {
    const parsed = schema.parse({
      package: '@walkeros/x',
      validate: { format: true },
    });
    expect('validate' in parsed).toBe(false);
  });
});
