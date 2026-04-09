import { StepExampleSchema } from '../flow';

describe('StepExampleSchema command field', () => {
  it('accepts a valid command', () => {
    const result = StepExampleSchema.safeParse({
      command: 'consent',
      in: { marketing: true },
      out: ['consent', 'update', {}],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an example without a command (default behavior)', () => {
    const result = StepExampleSchema.safeParse({
      in: { name: 'page view' },
      out: { name: 'page view' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown command value', () => {
    const result = StepExampleSchema.safeParse({
      command: 'conset', // typo
      in: {},
      out: {},
    });
    expect(result.success).toBe(false);
  });

  it.each(['config', 'consent', 'user', 'run'] as const)(
    'accepts command=%s',
    (cmd) => {
      const result = StepExampleSchema.safeParse({
        command: cmd,
        in: {},
        out: {},
      });
      expect(result.success).toBe(true);
    },
  );
});
