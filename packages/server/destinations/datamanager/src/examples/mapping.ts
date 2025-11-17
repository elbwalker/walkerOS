import type { DestinationDataManager } from '..';
import { isObject } from '@walkeros/core';

/**
 * Purchase event mapping for Google Ads conversion
 */
export const Purchase: DestinationDataManager.Rule = {
  name: 'purchase',
  data: {
    map: {
      // Required fields
      transactionId: 'data.id',
      conversionValue: 'data.total',
      currency: { key: 'data.currency', value: 'USD' },
      eventName: { value: 'purchase' },

      // User identification
      userId: 'user.id',
      email: 'user.id', // Will be hashed automatically

      // Attribution identifiers (captured by browser source from URL)
      gclid: 'context.gclid', // Google Click ID
      gbraid: 'context.gbraid', // iOS attribution
      wbraid: 'context.wbraid', // Web-to-app

      // Shopping cart data
      cartData: {
        map: {
          items: {
            loop: [
              'nested',
              {
                condition: (entity) =>
                  isObject(entity) && entity.entity === 'product',
                map: {
                  merchantProductId: 'data.id',
                  price: 'data.price',
                  quantity: { key: 'data.quantity', value: 1 },
                },
              },
            ],
          },
        },
      },
    },
  },
};

/**
 * Lead event mapping
 */
export const Lead: DestinationDataManager.Rule = {
  name: 'generate_lead',
  data: {
    map: {
      eventName: { value: 'generate_lead' },
      conversionValue: { value: 10 },
      currency: { value: 'USD' },
    },
  },
};

/**
 * Page view mapping for GA4
 */
export const PageView: DestinationDataManager.Rule = {
  name: 'page_view',
  data: {
    map: {
      eventName: { value: 'page_view' },
    },
  },
};

/**
 * Complete mapping configuration
 */
export const mapping = {
  order: {
    complete: Purchase,
  },
  lead: {
    submit: Lead,
  },
  page: {
    view: PageView,
  },
} satisfies DestinationDataManager.Rules;

/**
 * User data mapping configuration
 * Maps walkerOS user properties to Data Manager user identifiers
 */
export const userDataMapping: DestinationDataManager.Config = {
  settings: {
    accessToken: 'ya29.c.xxx',
    destinations: [
      {
        operatingAccount: {
          accountId: '123-456-7890',
          accountType: 'GOOGLE_ADS',
        },
        productDestinationId: 'AW-CONVERSION-123',
      },
    ],
  },
  data: {
    map: {
      email: 'user.id',
      phone: 'data.phone',
      firstName: 'data.firstName',
      lastName: 'data.lastName',
      regionCode: 'data.country',
      postalCode: 'data.zip',
    },
  },
  mapping,
};
