import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  identify: z
    .unknown()
    .describe(
      'Per-event identity mapping. Resolves to an object with any of: user, device, session, set, setOnce, add, append, prepend, preInsert, postInsert, remove, unset, clearAll.',
    )
    .optional(),
  revenue: z
    .unknown()
    .describe(
      'Revenue mapping. Resolves to a single object or (via loop) an array of objects, each with: productId, price, quantity, revenueType, currency, revenue, receipt, receiptSig, eventProperties. One amplitude.revenue() call fires per item.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Group assignment. Resolves to { type, name } → amplitude.setGroup(type, name).',
    )
    .optional(),
  groupIdentify: z
    .unknown()
    .describe(
      'Group properties. Resolves to { type, name, set?, setOnce?, ... } → amplitude.groupIdentify(type, name, identify).',
    )
    .optional(),
  reset: z
    .unknown()
    .describe(
      'Logout trigger. Resolves to a truthy value → amplitude.reset() (clears userId, regenerates deviceId). Typically used with skip: true on a user logout rule.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
