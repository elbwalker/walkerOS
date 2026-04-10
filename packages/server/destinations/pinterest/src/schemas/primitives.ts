import { z } from '@walkeros/core/dev';

/**
 * Action Source Enum
 * Where the conversion event took place
 * https://developers.pinterest.com/docs/conversions/conversions/
 */
export const ActionSourceSchema = z.enum([
  'app_android',
  'app_ios',
  'web',
  'offline',
]);

/**
 * Event Name
 * Standard Pinterest CAPI event names or custom event identifiers
 */
export const EventNameSchema = z.union([
  z.enum([
    'add_payment_info',
    'add_to_cart',
    'add_to_wishlist',
    'app_install',
    'app_open',
    'checkout',
    'contact',
    'custom',
    'customize_product',
    'find_location',
    'initiate_checkout',
    'lead',
    'page_visit',
    'schedule',
    'search',
    'signup',
    'start_trial',
    'submit_application',
    'subscribe',
    'view_category',
    'view_content',
    'watch_video',
  ]),
  z.string(), // Allow custom event names
]);
