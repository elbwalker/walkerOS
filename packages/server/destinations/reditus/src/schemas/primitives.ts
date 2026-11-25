import { z } from '@walkeros/core/dev';

/** Reditus call: a referral conversion (sign-up, demo) or a payment. */
export const CallTypeSchema = z.enum(['conversion', 'payment']);
