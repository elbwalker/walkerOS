import { z } from '@walkeros/core/dev';

/**
 * Standard Snapchat Conversions API event names (UPPERCASE).
 * https://businesshelp.snapchat.com/s/article/capi-parameters
 */
export const StandardEventNameSchema = z.union([
  z.enum([
    'PAGE_VIEW',
    'VIEW_CONTENT',
    'ADD_CART',
    'ADD_TO_WISHLIST',
    'START_CHECKOUT',
    'ADD_BILLING',
    'PURCHASE',
    'SIGN_UP',
    'SEARCH',
    'SAVE',
    'SUBSCRIBE',
    'COMPLETE_TUTORIAL',
    'START_TRIAL',
    'AD_CLICK',
    'AD_VIEW',
    'APP_OPEN',
    'LEVEL_COMPLETE',
    'INVITE',
    'LOGIN',
    'SHARE',
    'RESERVE',
    'ACHIEVEMENT_UNLOCKED',
    'SPENT_CREDITS',
    'RATE',
    'LIST_VIEW',
    'CUSTOM_EVENT_1',
    'CUSTOM_EVENT_2',
    'CUSTOM_EVENT_3',
    'CUSTOM_EVENT_4',
    'CUSTOM_EVENT_5',
  ]),
  z.string(), // Allow custom event names
]);
