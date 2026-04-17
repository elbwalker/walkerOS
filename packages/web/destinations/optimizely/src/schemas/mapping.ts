import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  eventKey: z
    .string()
    .describe(
      'Override event key sent to Optimizely. If omitted, the walkerOS event name is used. Must match an event created in your Optimizely project.',
    )
    .optional(),
  revenue: z
    .unknown()
    .describe(
      'Revenue mapping. Resolves to an integer in cents (e.g. 7281 = $72.81). Passed as eventTags.revenue to trackEvent().',
    )
    .optional(),
  value: z
    .unknown()
    .describe(
      'Numeric value mapping. Resolves to a float. Passed as eventTags.value to trackEvent().',
    )
    .optional(),
  eventTags: z
    .unknown()
    .describe(
      'Additional event tags. Resolves to Record<string, unknown>. Spread into the eventTags object passed to trackEvent().',
    )
    .optional(),
  attributes: z
    .unknown()
    .describe(
      "Per-event user attributes override. Resolves to Record<string, unknown>. Applied via setAttribute() before this event's trackEvent() call.",
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
