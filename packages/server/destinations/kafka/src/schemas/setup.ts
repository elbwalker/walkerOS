// Zod schema for the Kafka destination's setup options.
//
// The runtime contract (in `setup.ts`) requires `numPartitions` and
// `replicationFactor` and rejects the boolean form `setup: true` with an
// actionable error. The "no safe defaults" rule is enforced at runtime, not
// in this schema: configs frequently arrive from JSON where TS cannot enforce
// required fields, and the runtime check is the single source of truth. This
// schema therefore keeps both fields optional in shape, with the descriptions
// noting the runtime requirement so MCP / IntelliSense surfaces the constraint
// to authors.
import { z } from '@walkeros/core/dev';

const SchemaRegistrySchema = z.object({
  url: z.string().url().describe('Schema Registry URL.'),
  subject: z
    .string()
    .min(1)
    .describe('Subject name, conventionally <topic>-value.'),
  schemaType: z.enum(['AVRO', 'JSON', 'PROTOBUF']).describe('Schema type.'),
  schema: z.string().min(1).describe('The schema, stringified.'),
  compatibility: z
    .enum([
      'BACKWARD',
      'FORWARD',
      'FULL',
      'NONE',
      'BACKWARD_TRANSITIVE',
      'FORWARD_TRANSITIVE',
      'FULL_TRANSITIVE',
    ])
    .optional()
    .describe('Subject compatibility level set after registration.'),
  auth: z
    .object({ username: z.string(), password: z.string() })
    .optional()
    .describe('Optional Basic auth credentials.'),
});

export const SetupSchema = z.object({
  topic: z
    .string()
    .min(1)
    .optional()
    .describe('Topic name. Falls back to settings.kafka.topic if omitted.'),
  numPartitions: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Number of partitions. Required at runtime. No safe default; choose based on expected throughput and consumer parallelism.',
    ),
  replicationFactor: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Replication factor. Required at runtime. Must be <= broker count. No safe default.',
    ),
  configEntries: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Topic-level config entries, e.g. { "retention.ms": "604800000" }.',
    ),
  schemaRegistry: SchemaRegistrySchema.optional().describe(
    'Optional Confluent Schema Registry binding.',
  ),
  validateOnly: z
    .boolean()
    .optional()
    .describe(
      'Use kafkajs validateOnly mode (broker-side dry-run). Default: false.',
    ),
});

export type Setup = z.infer<typeof SetupSchema>;

export { SchemaRegistrySchema };
