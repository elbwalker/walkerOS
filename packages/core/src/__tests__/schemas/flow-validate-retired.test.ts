import {
  SourceSchema,
  TransformerSchema,
  DestinationSchema,
} from '../../schemas/flow';

describe('retired per-step validate field', () => {
  it.each([
    ['Source', SourceSchema],
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
