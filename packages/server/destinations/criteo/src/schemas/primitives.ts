import { z } from '@walkeros/core/dev';

/**
 * Standard Criteo Events API event names.
 * https://guides.criteotilt.com/events-api/
 */
export const CriteoEventNameSchema = z.union([
  z.enum([
    'viewHome',
    'viewPage',
    'viewItem',
    'viewList',
    'addToCart',
    'viewBasket',
    'beginCheckout',
    'trackTransaction',
    'addPaymentInfo',
    'login',
  ]),
  z.string(), // Allow custom event names
]);
