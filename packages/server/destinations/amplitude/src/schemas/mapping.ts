import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to an object with any of: user_id, device_id, session_id, set, setOnce, add, append, prepend, preInsert, postInsert, remove, unset, clearAll.',
    )
    .optional(),
  revenue: z
    .unknown()
    .describe(
      'Revenue mapping. Resolves to a single object or (via loop) an array, each with: productId, price, quantity, revenueType, currency, revenue, receipt, receiptSig, eventProperties. One amplitude.revenue() call fires per item.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Group assignment. Resolves to { type, name } -> amplitude.setGroup(type, name, eventOptions).',
    )
    .optional(),
  groupIdentify: z
    .unknown()
    .describe(
      'Group properties. Resolves to { type, name, set?, setOnce?, ... } -> amplitude.groupIdentify(type, name, identify, eventOptions).',
    )
    .optional(),
  eventOptions: z
    .unknown()
    .describe(
      'Per-rule EventOptions override. Resolves to { time?, insert_id?, ip?, ... }. Overrides destination-level eventOptions for this rule.',
    )
    .optional(),
  include: z
    .array(z.string())
    .describe(
      'Per-rule include override. Replaces destination-level include for this rule.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
