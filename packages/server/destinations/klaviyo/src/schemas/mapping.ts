import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identify mapping. Resolves to profile attributes for createOrUpdateProfile(). Use with rule-level silent: true on login/signup events.',
    )
    .optional(),
  value: z
    .unknown()
    .describe(
      'Revenue value mapping. Resolves to a numeric value for Klaviyo revenue tracking. Sets the event value attribute (value on the wire), plus valueCurrency when settings.currency is set.',
    )
    .optional(),
  uniqueId: z
    .unknown()
    .describe(
      'Dedup key mapping. Resolves to the event uniqueId (unique_id on the wire). Klaviyo keeps only the first event with a given value per profile and metric. Without it Klaviyo dedups on the event time truncated to the second.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
