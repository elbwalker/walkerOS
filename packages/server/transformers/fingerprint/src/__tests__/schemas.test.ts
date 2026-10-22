import { SettingsSchema } from '../schemas';

// The salt is required, so every parse carries one.
const salt = 'test-salt';

describe('SettingsSchema', () => {
  it('requires a salt', () => {
    expect(SettingsSchema.safeParse({}).success).toBe(false);
  });

  it.each(['ip', 'userAgent', 'site'])(
    'accepts a fallback list for %s, as Mapping.Value allows',
    (input) => {
      const result = SettingsSchema.safeParse({
        salt,
        [input]: ['event.source.url', 'ingest.origin'],
      });
      expect(result.success).toBe(true);
    },
  );

  it('accepts false to switch an input off', () => {
    expect(SettingsSchema.safeParse({ salt, site: false }).success).toBe(true);
  });

  it('accepts mapping values in fields', () => {
    const result = SettingsSchema.safeParse({
      salt,
      fields: ['ingest.ip', ['event.user.id', 'ingest.userId'], { key: 'x' }],
    });
    expect(result.success).toBe(true);
  });
});
