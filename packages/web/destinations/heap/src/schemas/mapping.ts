import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity. Resolves to a string for heap.identify(). Example: { "key": "data.email" }.',
    )
    .optional(),
  reset: z
    .unknown()
    .describe(
      'Reset Heap identity on this event. Set to true to call heap.resetIdentity().',
    )
    .optional(),
  userProperties: z
    .unknown()
    .describe(
      'Per-event user properties. Resolves to object for heap.addUserProperties().',
    )
    .optional(),
  eventProperties: z
    .unknown()
    .describe(
      'Per-event persistent event properties. Resolves to object for heap.addEventProperties() (persisted across page loads).',
    )
    .optional(),
  clearEventProperties: z
    .unknown()
    .describe(
      'Clear all persistent event properties. Set to true to call heap.clearEventProperties().',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
