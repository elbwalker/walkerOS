import { SourceSchema } from '../flow';

describe('SourceSchema strictness', () => {
  test('rejects an unknown key instead of stripping it', () => {
    const result = SourceSchema.safeParse({
      package: '@walkeros/web-source-browser',
      terminus: '$code:(e) => e',
    });
    expect(result.success).toBe(false);
  });

  test('rejects a typoed field name', () => {
    const result = SourceSchema.safeParse({
      package: '@walkeros/web-source-browser',
      nxt: 'myTransformer',
    });
    expect(result.success).toBe(false);
  });

  test('accepts every declared field', () => {
    const result = SourceSchema.safeParse({
      package: '@walkeros/web-source-browser@4.0.0',
      config: { settings: {} },
      env: {},
      primary: true,
      next: 'a',
      before: 'b',
    });
    expect(result.success).toBe(true);
  });
});
