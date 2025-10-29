import type { JSONSchema } from '@walkeros/core';

export type UiSchema = Record<string, unknown>;

/**
 * RJSF schema for Meta Pixel config-level settings
 * Matches Settings interface in types/index.ts
 *
 * @see {@link Settings} in types/index.ts
 */
export const settingsSchema: JSONSchema = {
  type: 'object',
  title: 'Meta Pixel Settings',
  properties: {
    pixelId: {
      type: 'string',
      title: 'Pixel ID',
      description: 'Your Meta (Facebook) Pixel ID',
      minLength: 1,
      pattern: '^[0-9]+$',
    },
  },
  required: ['pixelId'],
};

/**
 * UI Schema for Meta Pixel settings
 * Customizes visual presentation
 */
export const settingsUiSchema: UiSchema = {
  pixelId: {
    'ui:placeholder': 'e.g., 1234567890123456',
    'ui:help': 'Find your Pixel ID in Meta Events Manager',
  },
};

/**
 * RJSF schema for Meta Pixel rule-level mapping settings
 * Matches Mapping interface in types/index.ts
 *
 * @see {@link Mapping} in types/index.ts
 */
export const mappingSchema: JSONSchema = {
  type: 'object',
  title: 'Meta Pixel Mapping',
  properties: {
    track: {
      type: 'string',
      title: 'Standard Event Name',
      description: 'Meta Pixel standard event name',
      enum: [
        'PageView',
        'AddPaymentInfo',
        'AddToCart',
        'AddToWishlist',
        'CompleteRegistration',
        'Contact',
        'CustomizeProduct',
        'Donate',
        'FindLocation',
        'InitiateCheckout',
        'Lead',
        'Purchase',
        'Schedule',
        'Search',
        'StartTrial',
        'SubmitApplication',
        'Subscribe',
        'ViewContent',
      ],
    },
    trackCustom: {
      type: 'string',
      title: 'Custom Event Name',
      description: 'Custom event name for trackCustom',
    },
  },
};

/**
 * UI Schema for Meta Pixel mapping
 */
export const mappingUiSchema: UiSchema = {
  track: {
    'ui:placeholder': 'Select standard event',
    'ui:help': 'Use standard events for better conversion tracking',
  },
  trackCustom: {
    'ui:placeholder': 'e.g., CustomEventName',
    'ui:help': 'Custom events for tracking non-standard actions',
  },
  'ui:order': ['track', 'trackCustom'],
};

/**
 * RJSF schema for Meta Pixel event data properties
 * Describes the expected data structure for Meta Pixel events
 *
 * @see https://developers.facebook.com/docs/meta-pixel/reference
 */
export const dataSchema: JSONSchema = {
  type: 'object',
  title: 'Meta Pixel Event Data',
  description: 'Properties that can be sent with Meta Pixel events',
  properties: {
    value: {
      type: 'number',
      title: 'Value',
      description:
        'Monetary value of the event (e.g., purchase total, product price)',
    },
    currency: {
      type: 'string',
      title: 'Currency',
      description: 'Currency code in ISO 4217 format (e.g., USD, EUR, GBP)',
      enum: [
        'USD',
        'EUR',
        'GBP',
        'JPY',
        'CAD',
        'AUD',
        'CHF',
        'CNY',
        'SEK',
        'NZD',
        'KRW',
        'SGD',
        'NOK',
        'MXN',
        'INR',
        'BRL',
        'ZAR',
        'DKK',
        'PLN',
        'THB',
        'IDR',
        'HUF',
        'CZK',
        'ILS',
        'CLP',
        'PHP',
        'AED',
        'COP',
        'SAR',
        'MYR',
        'RON',
      ],
    },
    content_name: {
      type: 'string',
      title: 'Content Name',
      description: 'Name of the page, product, or content',
    },
    content_category: {
      type: 'string',
      title: 'Content Category',
      description: 'Category of the page or product',
    },
    content_ids: {
      type: 'array',
      title: 'Content IDs',
      description: 'Array of product IDs, SKUs, or content identifiers',
      items: {
        type: 'string',
      },
    },
    contents: {
      type: 'array',
      title: 'Contents',
      description: 'Array of product items with details (id, quantity, etc.)',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            title: 'Product ID',
            description: 'Product identifier or SKU',
          },
          quantity: {
            type: 'number',
            title: 'Quantity',
            description: 'Quantity of this product',
          },
          item_price: {
            type: 'number',
            title: 'Item Price',
            description: 'Price per item',
          },
        },
      },
    },
    content_type: {
      type: 'string',
      title: 'Content Type',
      description: 'Type of content (product or product_group)',
      enum: ['product', 'product_group'],
    },
    num_items: {
      type: 'number',
      title: 'Number of Items',
      description: 'Total number of items (e.g., in cart or order)',
    },
    predicted_ltv: {
      type: 'number',
      title: 'Predicted LTV',
      description: 'Predicted lifetime value of the customer',
    },
    search_string: {
      type: 'string',
      title: 'Search String',
      description: 'Search query entered by the user',
    },
    status: {
      type: 'boolean',
      title: 'Status',
      description: 'Status of the registration or checkout',
    },
  },
  additionalProperties: true,
};

/**
 * UI Schema for Meta Pixel data
 * Customizes visual presentation
 */
export const dataUiSchema: UiSchema = {
  value: {
    'ui:placeholder': 'e.g., 99.99',
    'ui:help': 'The monetary value associated with this event',
  },
  currency: {
    'ui:placeholder': 'Select currency',
    'ui:help': 'Use the ISO 4217 currency code',
  },
  content_name: {
    'ui:placeholder': 'e.g., Blue Running Shoes',
    'ui:help': 'Descriptive name of the content or product',
  },
  content_category: {
    'ui:placeholder': 'e.g., Shoes > Running',
    'ui:help': 'Category hierarchy for the content',
  },
  content_ids: {
    'ui:placeholder': 'Add product IDs',
    'ui:help': 'List of product identifiers',
  },
  contents: {
    'ui:help': 'Array of products with detailed information',
  },
  content_type: {
    'ui:placeholder': 'Select content type',
    'ui:help': 'Specify whether tracking individual products or product groups',
  },
  num_items: {
    'ui:placeholder': 'e.g., 3',
    'ui:help': 'Total quantity of items',
  },
  search_string: {
    'ui:placeholder': 'e.g., running shoes',
    'ui:help': 'The search term used by the customer',
  },
};
