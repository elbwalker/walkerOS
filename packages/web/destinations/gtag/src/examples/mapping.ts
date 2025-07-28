import type { Mapping } from '@walkeros/core';
import type { DestinationGtag } from '..';
import { isObject } from '@walkeros/core';

// GA4 Purchase Mapping
export const ga4Purchase: DestinationGtag.Rule = {
  name: 'purchase',
  settings: {
    ga4: {
      include: ['data', 'context'],
    },
  },
  data: {
    map: {
      transaction_id: 'data.id',
      value: 'data.total',
      tax: 'data.taxes',
      shipping: 'data.shipping',
      currency: { key: 'data.currency', value: 'EUR' },
      items: {
        loop: [
          'nested',
          {
            condition: (entity) =>
              isObject(entity) && entity.type === 'product',
            map: {
              item_id: 'data.id',
              item_name: 'data.name',
              quantity: { key: 'data.quantity', value: 1 },
            },
          },
        ],
      },
    },
  },
};

// GA4 Add to Cart Mapping
export const ga4AddToCart: DestinationGtag.Rule = {
  name: 'add_to_cart',
  settings: {
    ga4: {
      include: ['data'],
    },
  },
  data: {
    map: {
      currency: { value: 'EUR', key: 'data.currency' },
      value: 'data.price',
      items: {
        loop: [
          'this',
          {
            map: {
              item_id: 'data.id',
              item_variant: 'data.color',
              quantity: { value: 1, key: 'data.quantity' },
            },
          },
        ],
      },
    },
  },
};

// Google Ads Conversion Mapping
export const adsConversion: DestinationGtag.Rule = {
  name: 'CONVERSION_LABEL', // This becomes the conversion label
  settings: {
    ads: {},
  },
  data: {
    map: {
      value: 'data.total',
      currency: { value: 'EUR', key: 'data.currency' },
      transaction_id: 'data.id',
    },
  },
};

// GTM Event Mapping
export const gtmProductView: DestinationGtag.Rule = {
  name: 'product_view',
  settings: {
    gtm: {},
  },
  data: {
    map: {
      product_id: 'data.id',
      product_name: 'data.name',
      product_category: 'data.category',
      value: 'data.price',
      currency: { value: 'EUR', key: 'data.currency' },
    },
  },
};

// Combined mapping for all tools
export const combinedPurchase: DestinationGtag.Rule = {
  name: 'purchase', // GA4 event name
  settings: {
    ga4: {
      include: ['data'],
    },
    ads: {}, // Will use 'purchase' as conversion label for ads
    gtm: {},
  },
  data: {
    map: {
      transaction_id: 'data.id',
      value: 'data.total',
      currency: { value: 'EUR', key: 'data.currency' },
      items: {
        loop: [
          'nested',
          {
            condition: (entity) =>
              isObject(entity) && entity.type === 'product',
            map: {
              item_id: 'data.id',
              item_name: 'data.name',
              quantity: { value: 1, key: 'data.quantity' },
            },
          },
        ],
      },
    },
  },
};

// Example configuration with all mappings
export const config = {
  order: { complete: combinedPurchase },
  product: {
    add: ga4AddToCart,
    view: gtmProductView,
  },
} satisfies DestinationGtag.Rules;
