import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to { distinctId, alias? }. distinctId is passed as distinct_id to all SDK calls.',
    )
    .optional(),
  people: z
    .unknown()
    .describe(
      'Per-event people operations. Resolves to an object with any of: set, set_once, increment, append, union, remove, unset, delete_user. Each key fires a separate mp.people.* call with distinct_id as first arg.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Per-event group association. Resolves to { key, id }. The group key/id is added as a track() property.',
    )
    .optional(),
  groupProfile: z
    .unknown()
    .describe(
      'Per-event group profile operations. Resolves to { key, id, set?, set_once?, union?, remove?, unset?, delete? }. Fires mp.groups.* calls.',
    )
    .optional(),
  useImport: z
    .unknown()
    .describe(
      'Per-event import flag. When truthy, uses mp.import() instead of mp.track() for this rule.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
