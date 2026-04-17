import { z } from '@walkeros/core/dev';

/** mParticle data pod (regional endpoint selector). */
export const PodSchema = z.enum(['us1', 'us2', 'eu1', 'au1']);

/** Target environment for the batch. */
export const EnvironmentSchema = z.enum(['production', 'development']);

/** Supported mParticle event types emitted by this destination. */
export const EventTypeSchema = z.enum([
  'custom_event',
  'screen_view',
  'commerce_event',
]);

/** mParticle custom event category for `custom_event`. */
export const CustomEventTypeSchema = z.enum([
  'navigation',
  'location',
  'search',
  'transaction',
  'user_content',
  'user_preference',
  'social',
  'media',
  'attribution',
  'other',
]);
