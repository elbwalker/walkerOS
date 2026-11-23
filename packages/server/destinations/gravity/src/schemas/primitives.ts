import { z } from '@walkeros/core/dev';
import { ACTION_SOURCES } from '../types';

/** Where the conversion happened, one of Gravity's values. */
export const ActionSourceSchema = z.enum(ACTION_SOURCES);

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
