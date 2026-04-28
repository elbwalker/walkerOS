import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  eventName: z
    .string()
    .describe(
      'Override eventName for this rule. Without the prefix -- just the event name part (e.g. purchase_completed). The eventNamePrefix is prepended automatically.',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'Per-event contact upsert. Resolves to { email, properties }. Overrides destination-level identify. Use with silent: true on login/identify events.',
    )
    .optional(),
  properties: z
    .unknown()
    .describe(
      'Additional event properties mapping. Resolved values are merged with defaultProperties and serialized to strings.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
