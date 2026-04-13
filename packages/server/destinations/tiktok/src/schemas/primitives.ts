import { z } from '@walkeros/core/dev';

/**
 * Standard TikTok Event Names
 * https://business-api.tiktok.com/portal/docs?id=1771100865818625
 */
export const StandardEventNameSchema = z.union([
  z.enum([
    'ViewContent',
    'ClickButton',
    'Search',
    'AddToWishlist',
    'AddToCart',
    'InitiateCheckout',
    'AddPaymentInfo',
    'CompletePayment',
    'PlaceAnOrder',
    'Contact',
    'Download',
    'SubmitForm',
    'CompleteRegistration',
    'Subscribe',
  ]),
  z.string(), // Allow custom event names
]);
