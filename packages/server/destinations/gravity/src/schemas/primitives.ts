import { z } from '@walkeros/core/dev';

/** Gravity standard event names; any other name is a custom event. */
export const StandardEventSchema = z.enum([
  'Purchase',
  'Lead',
  'CompleteRegistration',
  'Subscribe',
  'StartTrial',
  'InitiateCheckout',
  'Schedule',
]);
