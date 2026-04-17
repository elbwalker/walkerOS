import { z } from '@walkeros/core/dev';

const SASLSchema = z.object({
  mechanism: z
    .enum(['plain', 'scram-sha-256', 'scram-sha-512', 'aws', 'oauthbearer'])
    .describe('SASL authentication mechanism.'),
  username: z
    .string()
    .optional()
    .describe('Username for plain/scram mechanisms.'),
  password: z
    .string()
    .optional()
    .describe('Password for plain/scram mechanisms.'),
  accessKeyId: z
    .string()
    .optional()
    .describe('AWS access key ID for IAM auth (mechanism: aws).'),
  secretAccessKey: z
    .string()
    .optional()
    .describe('AWS secret access key for IAM auth (mechanism: aws).'),
  sessionToken: z
    .string()
    .optional()
    .describe('AWS session token for temporary credentials (mechanism: aws).'),
  authorizationIdentity: z
    .string()
    .optional()
    .describe('AWS authorization identity (mechanism: aws).'),
});

const RetrySchema = z.object({
  maxRetryTime: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Max total retry wait in ms. Default: 30000.'),
  initialRetryTime: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('First retry delay in ms. Default: 300.'),
  retries: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Max retry count. Default: 5.'),
});

export const KafkaSettingsSchema = z.object({
  brokers: z
    .array(z.string().min(1))
    .min(1)
    .describe('Kafka broker addresses (host:port). At least one required.'),
  clientId: z
    .string()
    .optional()
    .describe('Kafka client ID. Default: walkeros.'),
  ssl: z
    .union([z.boolean(), z.record(z.string(), z.unknown())])
    .optional()
    .describe(
      'TLS configuration. Set true for default TLS, or provide a tls.ConnectionOptions object for mTLS.',
    ),
  sasl: SASLSchema.optional().describe(
    'SASL authentication config. Required for Confluent Cloud, AWS MSK with IAM, etc.',
  ),
  connectionTimeout: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Connection timeout in ms. Default: 1000.'),
  requestTimeout: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Request timeout in ms. Default: 30000.'),
  topic: z.string().min(1).describe('Target Kafka topic name.'),
  acks: z
    .number()
    .int()
    .min(-1)
    .max(1)
    .optional()
    .describe(
      'Acknowledgement level. -1 = all replicas, 0 = fire-and-forget, 1 = leader only. Default: -1.',
    ),
  timeout: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Broker response timeout in ms. Default: 30000.'),
  compression: z
    .enum(['none', 'gzip', 'snappy', 'lz4', 'zstd'])
    .optional()
    .describe(
      'Message compression codec. Default: gzip. Snappy/LZ4/ZSTD require additional npm packages.',
    ),
  idempotent: z
    .boolean()
    .optional()
    .describe(
      'Enable idempotent producer for exactly-once delivery. Default: false.',
    ),
  allowAutoTopicCreation: z
    .boolean()
    .optional()
    .describe('Allow auto-creation of topics on the broker. Default: false.'),
  key: z
    .string()
    .optional()
    .describe(
      'Mapping value path for message key derivation (e.g. user.id, data.userId). Default: entity_action.',
    ),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe('Static headers added to every message.'),
  retry: RetrySchema.optional().describe(
    'Retry configuration for transient failures.',
  ),
});

export const SettingsSchema = z.object({
  kafka: KafkaSettingsSchema.describe(
    'Kafka connection and producer settings.',
  ),
});

export type Settings = z.infer<typeof SettingsSchema>;
