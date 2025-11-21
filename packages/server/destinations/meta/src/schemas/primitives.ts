import { z } from '@walkeros/core/dev';

/**
 * Action Source Enum
 * Where the conversion event took place
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event
 */
export const ActionSourceSchema = z.enum([
  'email',
  'website',
  'app',
  'phone_call',
  'chat',
  'physical_store',
  'system_generated',
  'business_messaging',
  'other',
]);

/**
 * Event Name
 * Standard Meta event names or custom event identifiers
 */
export const EventNameSchema = z.union([
  z.enum([
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
  ]),
  z.string(), // Allow custom event names
]);
