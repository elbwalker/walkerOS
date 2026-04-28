import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to an object with any of: userId, traits, anonymousId. Use with rule-level `silent: true` on login/identify events.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Per-event group assignment. Resolves to { groupId, traits }. Use with rule-level `silent: true` on company/team events.',
    )
    .optional(),
  page: z
    .unknown()
    .describe(
      'Per-event page call configuration. Resolves to { category?, name?, properties? } for analytics.page(), or `true` for an empty analytics.page() that relies on SDK auto-collection. Use with rule-level `silent: true` on page view events.',
    )
    .optional(),
  reset: z
    .unknown()
    .describe(
      'Logout trigger. Resolves to a truthy value → analytics.reset() (clears userId, anonymousId, traits). Typically used with silent: true on a user logout rule.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
