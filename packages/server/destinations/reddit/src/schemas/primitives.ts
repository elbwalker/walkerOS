import { z } from '@walkeros/core/dev';

/**
 * Action Source Enum
 * Where the conversion event took place
 * https://ads-api.reddit.com/docs/v2/#tag/Conversions-API
 */
export const ActionSourceSchema = z.enum(['WEBSITE', 'APP', 'PHYSICAL_STORE']);

/**
 * Tracking Type
 * Standard Reddit Conversions API event types.
 * Custom events use `Custom` with a `custom_event_name`.
 */
export const TrackingTypeSchema = z.enum([
  'PageVisit',
  'ViewContent',
  'Search',
  'AddToCart',
  'AddToWishlist',
  'Purchase',
  'Lead',
  'SignUp',
  'Custom',
]);
