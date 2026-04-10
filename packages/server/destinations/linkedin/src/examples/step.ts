import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000900000,
    data: { total: 249.99, currency: 'EUR' },
    user: { email: 'jane@example.com' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    settings: {
      conversion: {
        map: {
          value: 'data.total',
          currency: { key: 'data.currency', value: 'EUR' },
        },
      },
    },
  },
  out: {
    elements: [
      {
        conversion: 'urn:lla:llaPartnerConversion:12345678',
        conversionHappenedAt: 1700000900000,
        conversionValue: {
          currencyCode: 'EUR',
          amount: '249.99',
        },
        user: {
          userIds: [
            {
              idType: 'SHA256_EMAIL',
              idValue:
                '8c87b489ce35cf2e2f39f80e282cb2e804932a56a213983eeeb428407d43b52d',
            },
          ],
        },
        eventId: '1700000900000-gr0up-1',
      },
    ],
  },
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000901000,
    user: { email: 'user@example.com' },
    source: { type: 'server', id: 'https://example.com', previous_id: '' },
  }),
  mapping: undefined,
  out: {
    elements: [
      {
        conversion: 'urn:lla:llaPartnerConversion:12345678',
        conversionHappenedAt: 1700000901000,
        user: {
          userIds: [
            {
              idType: 'SHA256_EMAIL',
              idValue:
                'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
            },
          ],
        },
        eventId: '1700000901000-gr0up-1',
      },
    ],
  },
};

export const purchaseWithLiFatId: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000902000,
    data: { total: 89.99, currency: 'USD' },
    user: { email: 'buyer@co.com' },
    context: { li_fat_id: ['abc123-fat-id', 0] },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    settings: {
      conversion: {
        map: {
          value: 'data.total',
          currency: { key: 'data.currency', value: 'USD' },
        },
      },
    },
    data: {
      map: {
        user_data: {
          map: {
            li_fat_id: 'context.li_fat_id',
          },
        },
      },
    },
  },
  out: {
    elements: [
      {
        conversion: 'urn:lla:llaPartnerConversion:12345678',
        conversionHappenedAt: 1700000902000,
        conversionValue: {
          currencyCode: 'USD',
          amount: '89.99',
        },
        user: {
          userIds: [
            {
              idType: 'SHA256_EMAIL',
              idValue:
                '484c39bfb51212665d9673805c112b5ba04cbf0460b6d3f00bcdc18b92afed66',
            },
            {
              idType: 'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID',
              idValue: 'abc123-fat-id',
            },
          ],
        },
        eventId: '1700000902000-gr0up-1',
      },
    ],
  },
};
