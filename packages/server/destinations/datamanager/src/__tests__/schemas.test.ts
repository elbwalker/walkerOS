import { SettingsSchema } from '../schemas/settings';
import { examples } from '../dev';

const minimal = examples.minimal.settings;

const destinationWith = (accountType: string) => ({
  destinations: [
    {
      operatingAccount: { accountId: '1234567890', accountType },
      productDestinationId: '987654321',
    },
  ],
});

const loginAccount = { accountId: '1112223333', accountType: 'GOOGLE_ADS' };

describe('SettingsSchema', () => {
  it.each([
    ['testEventCode', { testEventCode: 'TEST1' }],
    ['batchSize', { batchSize: 100 }],
    ['batchInterval', { batchInterval: 5000 }],
    ['DISPLAY_VIDEO_ADVERTISER', destinationWith('DISPLAY_VIDEO_ADVERTISER')],
    ['DISPLAY_VIDEO_PARTNER', destinationWith('DISPLAY_VIDEO_PARTNER')],
  ])('the settings schema refuses removed names: %s', (_, row) => {
    const result = SettingsSchema.safeParse({ ...minimal, ...row });

    expect(result.success).toBe(false);
  });

  it.each(['GOOGLE_ADS', 'GOOGLE_ANALYTICS_PROPERTY'])(
    'keeps the account types events go to: %s',
    (accountType) => {
      const result = SettingsSchema.safeParse({
        ...minimal,
        ...destinationWith(accountType),
      });

      expect(result.error).toBeUndefined();
    },
  );

  it('accepts loginAccount', () => {
    const [destination] = destinationWith('GOOGLE_ADS').destinations;

    const result = SettingsSchema.safeParse({
      ...minimal,
      destinations: [{ ...destination, loginAccount }],
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.destinations[0].loginAccount).toEqual(loginAccount);
  });

  it.each([
    ['1234567890', 'operatingAccount', true],
    ['123-456-7890', 'operatingAccount', false],
    ['AW-123', 'operatingAccount', false],
    ['1234567890', 'loginAccount', true],
    ['123-456-7890', 'loginAccount', false],
    ['AW-123', 'loginAccount', false],
  ])(
    'accountId is digits: %s on %s parses %s',
    (accountId, account, parses) => {
      const [destination] = destinationWith('GOOGLE_ADS').destinations;
      const accounts = {
        operatingAccount: destination.operatingAccount,
        loginAccount,
      };

      const result = SettingsSchema.safeParse({
        ...minimal,
        destinations: [
          {
            ...destination,
            ...accounts,
            [account]: { accountId, accountType: 'GOOGLE_ADS' },
          },
        ],
      });

      expect(result.success).toBe(parses);
    },
  );
});
