import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * LinkedIn Conversions API step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(body), options)` where
 *   endpoint = `${settings.url}conversionEvents`
 *   body    = `{ elements: [conversionEvent] }`
 *
 * Test fixture pins `conversionRuleId = '12345678'` and the default url, so
 * every call targets:
 *   https://api.linkedin.com/rest/conversionEvents
 *
 * Each conversion event is emitted with keys in the destination's build order:
 *   1. conversion (`urn:lla:llaPartnerConversion:<ruleId>`)
 *   2. conversionHappenedAt (raw `event.timestamp` in ms)
 *   3. user
 *   4. eventId
 *   5. conversionValue (only when mapping provides a value)
 *
 * `options` carries the Authorization + LinkedIn-specific headers.
 */
const ENDPOINT = 'https://api.linkedin.com/rest/conversionEvents';
const OPTIONS = {
  headers: {
    Authorization: 'Bearer s3cr3t',
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'X-RestLi-Method': 'BATCH_CREATE',
    'Linkedin-Version': '202604',
  },
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order is sent to the LinkedIn Conversions API with conversion value, currency, and hashed email.',
  in: getEvent('order complete', {
    id: 'ev-1700000900000',
    timestamp: 1700000900000,
    data: { total: 249.99, currency: 'EUR' },
    user: { email: 'jane@example.com' },
    source: { type: 'express', platform: 'server' },
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
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        elements: [
          {
            conversion: 'urn:lla:llaPartnerConversion:12345678',
            conversionHappenedAt: 1700000900000,
            user: {
              userIds: [
                {
                  idType: 'SHA256_EMAIL',
                  // sha256('jane@example.com')
                  idValue:
                    '8c87b489ce35cf2e2f39f80e282cb2e804932a56a213983eeeb428407d43b52d',
                },
              ],
            },
            eventId: 'ev-1700000900000',
            conversionValue: {
              currencyCode: 'EUR',
              amount: '249.99',
            },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const lead: Flow.StepExample = {
  title: 'Lead',
  description:
    'A form submission is posted to LinkedIn as a conversion with the SHA-256 hashed email as the user identifier.',
  in: getEvent('form submit', {
    id: 'ev-1700000901000',
    timestamp: 1700000901000,
    user: { email: 'user@example.com' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: undefined,
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        elements: [
          {
            conversion: 'urn:lla:llaPartnerConversion:12345678',
            conversionHappenedAt: 1700000901000,
            user: {
              userIds: [
                {
                  idType: 'SHA256_EMAIL',
                  // sha256('user@example.com')
                  idValue:
                    'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
                },
              ],
            },
            eventId: 'ev-1700000901000',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const purchaseWithLiFatId: Flow.StepExample = {
  title: 'Purchase with li_fat_id',
  description:
    'A purchase is sent to LinkedIn with both the hashed email and the first-party li_fat_id tracking identifier.',
  in: getEvent('order complete', {
    id: 'ev-1700000902000',
    timestamp: 1700000902000,
    data: { total: 89.99, currency: 'USD' },
    user: { email: 'buyer@co.com' },
    context: { li_fat_id: ['abc123-fat-id', 0] },
    source: { type: 'express', platform: 'server' },
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
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        elements: [
          {
            conversion: 'urn:lla:llaPartnerConversion:12345678',
            conversionHappenedAt: 1700000902000,
            user: {
              userIds: [
                {
                  idType: 'SHA256_EMAIL',
                  // sha256('buyer@co.com')
                  idValue:
                    '484c39bfb51212665d9673805c112b5ba04cbf0460b6d3f00bcdc18b92afed66',
                },
                {
                  idType: 'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID',
                  idValue: 'abc123-fat-id',
                },
              ],
            },
            eventId: 'ev-1700000902000',
            conversionValue: {
              currencyCode: 'USD',
              amount: '89.99',
            },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};
