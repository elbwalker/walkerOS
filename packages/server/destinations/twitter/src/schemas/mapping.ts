import { z } from '@walkeros/core/dev';

/**
 * X (Twitter) Conversions API Mapping Schema
 *
 * Per-event override for the conversion event ID and monetary details.
 */
export const MappingSchema = z.object({
  eventId: z
    .string()
    .describe('Override the default conversion event ID for this event')
    .optional(),
  value: z
    .union([z.string(), z.number()])
    .describe('Conversion monetary value (sent to X as a string)')
    .optional(),
  currency: z
    .string()
    .describe('ISO 4217 currency code (like USD, EUR)')
    .optional(),
  number_items: z
    .number()
    .int()
    .describe('Number of items in the conversion')
    .optional(),
  description: z
    .string()
    .describe('Free-text description of the conversion')
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
