import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to { userId, ...attributes } -> Hotjar.identify(userId, attributes).',
    )
    .optional(),
  stateChange: z
    .unknown()
    .describe(
      'SPA route change notification. Resolves to a relative path string -> Hotjar.stateChange(path). Used for accurate heatmaps on virtual page views.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
