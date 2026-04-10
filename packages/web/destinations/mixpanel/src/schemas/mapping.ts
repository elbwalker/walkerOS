import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to { distinctId } → mixpanel.identify(distinctId).',
    )
    .optional(),
  people: z
    .unknown()
    .describe(
      'Per-event people operations. Resolves to an object with any of: set, set_once, increment, append, union, remove, unset, delete_user. Each key fires a separate mixpanel.people.* call.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Per-event group assignment. Resolves to { key, id } → mixpanel.set_group(key, id).',
    )
    .optional(),
  groupProfile: z
    .unknown()
    .describe(
      'Per-event group profile operations. Resolves to { key, id, set?, set_once?, unset?, union?, remove?, delete? } → mixpanel.get_group(key, id).set/... calls.',
    )
    .optional(),
  reset: z
    .unknown()
    .describe(
      'Logout trigger. Resolves to a truthy value → mixpanel.reset(). Typically used with skip: true on a user logout rule.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
