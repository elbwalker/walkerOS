import { z } from '@walkeros/core/dev';

export const MappingSchema = z.object({
  key: z
    .string()
    .optional()
    .describe(
      'Override message key mapping path for this rule (e.g. data.id). Takes precedence over settings.kafka.key.',
    ),
  topic: z
    .string()
    .optional()
    .describe(
      'Override Kafka topic for this rule. Takes precedence over settings.kafka.topic.',
    ),
});

export type Mapping = z.infer<typeof MappingSchema>;
