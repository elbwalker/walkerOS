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

describe('SettingsSchema output paths', () => {
  it.each(['botScore', 'botCategory', 'botProduct', 'botReasons'])(
    'accepts a dot path for %s',
    (field) => {
      const result = SettingsSchema.safeParse({
        output: { [field]: 'ingest.bot.value' },
      });
      expect(result.success).toBe(true);
    },
  );

  it.each(['botScore', 'botCategory', 'botProduct', 'botReasons'])(
    'accepts false to disable %s',
    (field) => {
      const result = SettingsSchema.safeParse({ output: { [field]: false } });
      expect(result.success).toBe(true);
    },
  );

  it('rejects true, which would name no path', () => {
    const result = SettingsSchema.safeParse({ output: { botScore: true } });
    expect(result.success).toBe(false);
  });
});

describe('SettingsSchema context', () => {
  it.each(['auto', 'navigation', 'pixel', 'beacon', 'fetch', 'server'])(
    'accepts context %s',
    (context) => {
      expect(SettingsSchema.safeParse({ context }).success).toBe(true);
    },
  );

  it('rejects a context outside the vocabulary', () => {
    expect(SettingsSchema.safeParse({ context: 'websocket' }).success).toBe(
      false,
    );
  });
});

describe('SettingsSchema suspiciousAt', () => {
  it('accepts a number', () => {
    expect(SettingsSchema.safeParse({ suspiciousAt: 40 }).success).toBe(true);
  });

  it('rejects a non-number', () => {
    expect(SettingsSchema.safeParse({ suspiciousAt: '40' }).success).toBe(
      false,
    );
  });
});

describe('SettingsSchema input names', () => {
  it.each([
    'accept',
    'contentType',
    'referer',
    'signatureAgent',
    'method',
    'ja4',
    'headerNames',
  ])('accepts input name %s', (name) => {
    const result = SettingsSchema.safeParse({
      input: { [name]: 'ingest.value' },
    });
    expect(result.success).toBe(true);
  });
});
