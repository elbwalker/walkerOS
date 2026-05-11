import { z } from '@walkeros/core/dev';

/**
 * SNS Mapping Schema.
 *
 * `messageAttributes` is `Mapping.Map`: each value resolves per event to the
 * SDK's `{ DataType, StringValue }` shape. Schema accepts any structure;
 * runtime mapping resolution coerces shape via `getMappingValue`.
 *
 * `messageGroupId` and `messageDeduplicationId` are `Mapping.Value`: a string
 * path or a value-config object.
 */
export const MappingSchema = z.object({
  messageAttributes: z.record(z.string(), z.unknown()).optional(),
  messageGroupId: z.unknown().optional(),
  messageDeduplicationId: z.unknown().optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
