import { SettingsSchema } from '../schemas';

describe('SettingsSchema', () => {
  it.each(['ip', 'userAgent', 'site'])(
    'accepts a fallback list for %s, as Mapping.Value allows',
    (input) => {
      const result = SettingsSchema.safeParse({
        [input]: ['event.source.url', 'ingest.origin'],
      });
      expect(result.success).toBe(true);
    },
  );

  it('accepts false to switch an input off', () => {
    expect(SettingsSchema.safeParse({ site: false }).success).toBe(true);
  });

  it('accepts mapping values in fields', () => {
    const result = SettingsSchema.safeParse({
      fields: ['ingest.ip', ['event.user.id', 'ingest.userId'], { key: 'x' }],
    });
    expect(result.success).toBe(true);
  });
});
