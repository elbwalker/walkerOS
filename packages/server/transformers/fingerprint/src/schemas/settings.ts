import { z } from '@walkeros/core/dev';

const FieldSchema = z.union([
  z.string().describe('Dot-notation path: "ingest.ip", "event.data.userId"'),
  z
    .object({
      key: z.string().optional().describe('Source property path'),
      value: z.unknown().optional().describe('Static value or fallback'),
      fn: z
        .string()
        .optional()
        .describe(
          '$code: function receiving { event, ingest } that returns the value. Runs only when no key is set.',
        ),
    })
    .describe('Mapping value config for computed fields'),
]);

const InputSchema = z.union([
  FieldSchema,
  z.literal(false).describe('Switch this input off'),
]);

/**
 * Fingerprint transformer settings schema.
 *
 * Mirrors: types.ts FingerprintSettings
 */
export const SettingsSchema = z
  .object({
    salt: z
      .string()
      .optional()
      .describe(
        'Secret key for the hash (HMAC), e.g. "$env.FINGERPRINT_SALT". Without it the hash can be reversed to the IP; a warning is logged.',
      ),
    rotate: z
      .enum(['daily', 'hourly', 'none'])
      .optional()
      .describe(
        'Rotation window in UTC: the same visitor gets a new hash each window. Default: "daily"',
      ),
    ip: InputSchema.optional().describe(
      'Client IP, anonymized to /24 (IPv4) or /48 (IPv6) before hashing. Default: "ingest.ip" when fields is not set',
    ),
    userAgent: InputSchema.optional().describe(
      'User agent, reduced to browser, major version and OS before hashing. Default: "ingest.userAgent" when fields is not set',
    ),
    site: InputSchema.optional().describe(
      'Site the visitor is on; a URL is reduced to its hostname. Default: "event.source.url" when fields is not set',
    ),
    fields: z
      .array(FieldSchema)
      .optional()
      .describe(
        'Extra fields to include in hash (order matters). Each resolved via getMappingValue with source { event, ingest }. When set, named inputs are only used if set explicitly.',
      ),
    output: z
      .string()
      .optional()
      .describe(
        'Dot-notation path where hash is stored on the event. Default: "user.hash"',
      ),
    length: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Truncate hash to this length. Default: full 64-char SHA-256 hash',
      ),
  })
  .describe(
    'Fingerprint transformer: a cookieless, privacy-friendly visitor hash',
  );

export type Settings = z.infer<typeof SettingsSchema>;
