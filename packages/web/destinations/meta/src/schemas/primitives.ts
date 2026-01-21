import { z } from '@walkeros/core/dev';

/**
 * Meta Pixel ID
 * Must be a numeric string (Facebook Pixel IDs are numeric)
 */
export const PixelId = z
  .string()
  .min(1)
  .regex(/^[0-9]+$/, 'Pixel ID must contain only digits');

/**
 * Meta Pixel Standard Event Names
 * https://developers.facebook.com/docs/meta-pixel/reference
 */
export const StandardEventName = z.enum([
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
]);

/**
 * Custom Event Name
 * Any string for custom tracking
 */
export const CustomEventName = z.string().min(1);
