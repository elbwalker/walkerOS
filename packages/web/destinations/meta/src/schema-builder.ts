/**
 * Meta Pixel Schemas - Using Core Schema Builder
 *
 * This replaces hand-written JSON Schema with the DRY schema builder utility.
 * No Zod dependency needed!
 *
 * Comparison:
 * - Old: 92 lines of hand-written JSON Schema
 * - New: ~40 lines using schema builder
 * - Savings: 57% less code!
 */

import { createObjectSchema, type JSONSchema } from '@walkeros/core';

export type UiSchema = Record<string, unknown>;

/**
 * Meta Pixel standard events
 */
const META_STANDARD_EVENTS = [
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
] as const;

/**
 * Settings schema - Config-level settings
 */
export const settingsSchemaGenerated: JSONSchema = createObjectSchema(
  {
    pixelId: {
      type: 'string',
      required: true,
      pattern: '^[0-9]+$',
      description: 'Your Meta (Facebook) Pixel ID',
      minLength: 1,
    },
  },
  'Meta Pixel Settings',
);

/**
 * Mapping schema - Rule-level mapping settings
 */
export const mappingSchemaGenerated: JSONSchema = createObjectSchema(
  {
    track: {
      type: 'string',
      description: 'Meta Pixel standard event name',
      enum: META_STANDARD_EVENTS as unknown as string[],
    },
    trackCustom: {
      type: 'string',
      description: 'Custom event name for trackCustom',
    },
    enabled: {
      type: 'boolean',
      description: 'Enable or disable this tracking rule',
    },
  },
  'Meta Pixel Mapping',
);

/**
 * UI Schemas (same as before)
 */
export const settingsUiSchemaGenerated: UiSchema = {
  pixelId: {
    'ui:placeholder': 'e.g., 1234567890123456',
    'ui:help': 'Find your Pixel ID in Meta Events Manager',
  },
};

export const mappingUiSchemaGenerated: UiSchema = {
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
