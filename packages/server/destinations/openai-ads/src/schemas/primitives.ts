import { z } from '@walkeros/core/dev';

/**
 * Where the conversion happened.
 * https://developers.openai.com/ads/conversions-api
 */
export const ActionSourceSchema = z.enum([
  'web',
  'mobile_app',
  'offline',
  'physical_store',
  'phone_call',
  'email',
  'other',
]);

/**
 * Standard OpenAI Ads event types. Any other mapped name is sent as a
 * `custom` event with that name as `custom_event_name`.
 */
export const EventTypeSchema = z.enum([
  'app_installed',
  'app_opened',
  'appointment_scheduled',
  'checkout_started',
  'contents_viewed',
  'items_added',
  'lead_created',
  'order_created',
  'page_viewed',
  'registration_completed',
  'subscription_created',
  'trial_started',
]);
