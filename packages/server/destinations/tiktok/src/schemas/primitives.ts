import { z } from '@walkeros/core/dev';

/**
 * Some of TikTok's standard event names. TikTok's own list is the complete
 * one: https://ads.tiktok.com/help/article/standard-events-parameters
 */
export const StandardEventNameSchema = z.union([
  z.enum([
    'ViewContent',
    'Search',
    'AddToWishlist',
    'AddToCart',
    'InitiateCheckout',
    'AddPaymentInfo',
    'Purchase',
    'Contact',
    'Download',
    'SubmitForm',
    'CompleteRegistration',
    'Subscribe',
  ]),
  z.string(), // Allow custom event names
]);
