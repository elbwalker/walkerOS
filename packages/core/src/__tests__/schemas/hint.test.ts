import { HintSchema, HintsSchema, CodeSchema } from '../../schemas';

describe('Hint schemas', () => {
  test('CodeSchema validates code with lang', () => {
    const result = CodeSchema.safeParse({ lang: 'sql', code: 'SELECT 1' });
    expect(result.success).toBe(true);
  });

  test('CodeSchema validates code without lang', () => {
    const result = CodeSchema.safeParse({ code: 'npm install' });
    expect(result.success).toBe(true);
  });

  test('CodeSchema rejects missing code', () => {
    const result = CodeSchema.safeParse({ lang: 'sql' });
    expect(result.success).toBe(false);
  });

  test('HintSchema validates hint with text only', () => {
    const result = HintSchema.safeParse({ text: 'Use SA key for auth' });
    expect(result.success).toBe(true);
  });

  test('HintSchema validates hint with code array', () => {
    const result = HintSchema.safeParse({
      text: 'Default credentials on GCP',
      code: [{ lang: 'json', code: '{ "projectId": "my-project" }' }],
    });
    expect(result.success).toBe(true);
  });

  test('HintsSchema validates record of hints', () => {
    const result = HintsSchema.safeParse({
      'auth-sa': { text: 'Use service account key' },
      'auth-default': {
        text: 'Use default credentials',
        code: [{ code: 'gcloud auth' }],
      },
    });
    expect(result.success).toBe(true);
  });

  test('HintsSchema allows empty record', () => {
    const result = HintsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
