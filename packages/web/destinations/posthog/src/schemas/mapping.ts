import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to an object with any of: distinctId, $set, $set_once. Omitting distinctId routes to setPersonProperties() (no identity change).',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Group assignment. Resolves to { type, key, properties? } → posthog.group(type, key, properties).',
    )
    .optional(),
  reset: z
    .unknown()
    .describe(
      'Logout trigger. Resolves to a truthy value → posthog.reset() (clears distinctId and regenerates an anonymous one). Typically used with silent: true on a user logout rule.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
