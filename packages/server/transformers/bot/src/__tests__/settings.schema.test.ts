import { zodToSchema } from '@walkeros/core/dev';
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

describe('context schema forms', () => {
  test.each([
    ['enum literal', 'beacon'],
    ['dot-path string', 'ingest.transport'],
    ['key object', { key: 'ingest.transport' }],
    ['static value object', { value: 'pixel' }],
    ['fallback array', [{ key: 'ingest.transport' }, { value: 'beacon' }]],
  ])('accepts %s', (_name, context) => {
    expect(SettingsSchema.safeParse({ context }).success).toBe(true);
  });

  test('rejects a bare non-enum string without a dot (typo guard)', () => {
    expect(SettingsSchema.safeParse({ context: 'beacn' }).success).toBe(false);
  });

  test('rejects non-string primitives', () => {
    expect(SettingsSchema.safeParse({ context: 42 }).success).toBe(false);
  });

  test.each([
    ['a bare literal-looking string inside a fallback array', ['beacon']],
    ['a typo inside a fallback array', [{ key: 'ingest.transport' }, 'beacn']],
  ])('rejects %s', (_name, context) => {
    expect(SettingsSchema.safeParse({ context }).success).toBe(false);
  });
});

describe('context guard in the generated JSON Schema', () => {
  // The published artifact is zodToSchema(SettingsSchema), not the zod schema
  // itself: `walkeros validate` and the MCP catalog read dist/walkerOS.json and
  // run it through Ajv. A guard that has no JSON Schema representation (.refine)
  // is dropped silently in that conversion, so safeParse tests alone cannot see
  // whether the shipped schema still guards.
  const dottedString = expect.objectContaining({
    type: 'string',
    pattern: '\\.',
  });

  test('the dot guard survives conversion, at both string leaves', () => {
    expect(zodToSchema(SettingsSchema)).toMatchObject({
      properties: {
        context: {
          anyOf: expect.arrayContaining([
            dottedString,
            expect.objectContaining({
              type: 'array',
              items: expect.objectContaining({
                anyOf: expect.arrayContaining([dottedString]),
              }),
            }),
          ]),
        },
      },
    });
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
