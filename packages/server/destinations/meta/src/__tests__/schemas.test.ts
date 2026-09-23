import { SettingsSchema, settings } from '../schemas';

describe('SettingsSchema', () => {
  const required = { accessToken: 's3cr3t', pixelId: '1234567890' };

  it.each([
    ['a path', 'user.email'],
    ['a value', { value: 'abc' }],
    ['a set', { set: ['user.device', 'user.session'] }],
    ['a map', { map: { nested: 'user.id' } }],
    ['a key with fn', { key: 'user.phone', fn: '$code:(v) => v' }],
    ['a list of fallbacks', ['user.email', 'data.email']],
  ])('accepts %s as user_data value', (_, value) => {
    const result = SettingsSchema.safeParse({
      ...required,
      user_data: { em: value },
    });

    expect(result.error).toBeUndefined();
  });

  // Meta's customer information parameters, plus fbclid which the destination
  // turns into fbc
  it.each([
    'em',
    'ph',
    'fn',
    'ln',
    'db',
    'ge',
    'ct',
    'st',
    'zp',
    'country',
    'external_id',
    'client_ip_address',
    'client_user_agent',
    'fbc',
    'fbp',
    'subscription_id',
    'fb_login_id',
    'lead_id',
    'anon_id',
    'madid',
    'page_id',
    'page_scoped_user_id',
    'ctwa_clid',
    'ig_account_id',
    'ig_sid',
    'fbclid',
  ])('accepts user_data key %s', (key) => {
    const result = SettingsSchema.safeParse({
      ...required,
      user_data: { [key]: 'user.id' },
    });

    expect(result.error).toBeUndefined();
  });

  it.each(['email', 'phone', 'constructor'])(
    'rejects unknown user_data key %s',
    (key) => {
      const result = SettingsSchema.safeParse({
        ...required,
        user_data: { [key]: 'user.email' },
      });

      expect(result.success).toBe(false);
    },
  );

  it('restricts user_data keys in the JSON schema', () => {
    expect(settings).toMatchObject({
      properties: {
        user_data: {
          propertyNames: { enum: expect.arrayContaining(['em', 'fbclid']) },
          additionalProperties: { $ref: '#/definitions/MappingValue' },
        },
      },
    });
  });
});
