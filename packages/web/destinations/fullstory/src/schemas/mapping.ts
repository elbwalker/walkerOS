import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to { uid, properties? } for FullStory setIdentity. Overrides destination-level identify for this event.',
    )
    .optional(),
  set: z
    .unknown()
    .describe(
      'Property mapping. Resolved object keys become FullStory setProperties() properties. Use with setType to control scope.',
    )
    .optional(),
  setType: z
    .enum(['user', 'page'])
    .describe(
      'Property scope for the set mapping. "user" persists across sessions; "page" resets on navigation. Default: "user".',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
