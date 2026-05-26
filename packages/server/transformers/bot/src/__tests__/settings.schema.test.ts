import { SettingsSchema } from '../schemas/settings';

describe('SettingsSchema MappingValueSchema', () => {
  it('accepts an array of fallback mapping values', () => {
    const result = SettingsSchema.safeParse({
      input: {
        userAgent: [
          'ingest.headers.user-agent',
          'ingest.userAgent',
          { value: 'unknown' },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('still accepts a single string mapping', () => {
    const result = SettingsSchema.safeParse({
      input: { userAgent: 'ingest.userAgent' },
    });
    expect(result.success).toBe(true);
  });

  it('still accepts a single object mapping', () => {
    const result = SettingsSchema.safeParse({
      input: { userAgent: { key: 'ua', value: 'fallback' } },
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty array (degenerate but valid)', () => {
    const result = SettingsSchema.safeParse({
      input: { userAgent: [] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a mapping value with the wrong shape inside an array', () => {
    const result = SettingsSchema.safeParse({
      input: { userAgent: [123] },
    });
    expect(result.success).toBe(false);
  });
});
