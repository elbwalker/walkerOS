import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * RJSF schema for Meta Pixel config-level settings
 * Matches Settings interface in types/index.ts
 *
 * @see {@link Settings} in types/index.ts
 */
export const settingsSchema: RJSFSchema = {
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
export const mappingSchema: RJSFSchema = {
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
