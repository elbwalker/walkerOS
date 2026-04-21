import { StepExampleSchema } from '../flow';

describe('StepExampleSchema metadata fields', () => {
  it('accepts title, description, and public', () => {
    const result = StepExampleSchema.safeParse({
      title: 'Purchase',
      description: 'Happy-path purchase event',
      public: true,
      in: { name: 'order complete' },
      out: [['return', { name: 'order complete' }]],
    });
    expect(result.success).toBe(true);
  });

  it('defaults public to undefined (interpreted as true by consumers)', () => {
    const result = StepExampleSchema.safeParse({
      in: {},
      out: [],
    });
    expect(result.success).toBe(true);
    expect(result.data?.public).toBeUndefined();
  });

  it('accepts public: false for internal fixtures', () => {
    const result = StepExampleSchema.safeParse({
      public: false,
      in: {},
      out: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-boolean public', () => {
    const result = StepExampleSchema.safeParse({
      public: 'yes',
      in: {},
      out: [],
    });
    expect(result.success).toBe(false);
  });
});
