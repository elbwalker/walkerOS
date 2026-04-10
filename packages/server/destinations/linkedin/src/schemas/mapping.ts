import { z } from '@walkeros/core/dev';

/**
 * LinkedIn Conversions API Mapping Schema
 *
 * Per-event override for conversion rule, value, and currency.
 * The `conversion` field is a mapping value that resolves to an object
 * with optional `ruleId`, `value`, and `currency` keys.
 */
export const MappingSchema = z.object({
  conversion: z
    .object({
      ruleId: z
        .string()
        .describe('Override conversion rule ID for this event')
        .optional(),
      value: z
        .union([z.string(), z.number()])
        .describe('Conversion monetary value')
        .optional(),
      currency: z
        .string()
        .describe('ISO 4217 currency code (like USD, EUR)')
        .optional(),
    })
    .describe('Per-event conversion override with ruleId, value, and currency')
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
