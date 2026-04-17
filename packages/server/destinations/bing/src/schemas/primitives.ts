import { z } from '@walkeros/core/dev';

/**
 * Bing UET CAPI event type. `pageLoad` for page views, `custom` for all
 * other conversion events.
 * https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking-capi
 */
export const EventTypeSchema = z.enum(['pageLoad', 'custom']);

/**
 * adStorageConsent — `G` when granted, `D` when denied. Defaults to `G`
 * when the event reaches the destination (pre-filtered via consent rules).
 */
export const AdStorageConsentSchema = z.enum(['G', 'D']);
