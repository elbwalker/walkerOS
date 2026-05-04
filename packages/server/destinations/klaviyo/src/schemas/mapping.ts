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
      'Revenue value mapping. Resolves to a numeric value for Klaviyo revenue tracking. Sets the value property and valueCurrency on the event.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
