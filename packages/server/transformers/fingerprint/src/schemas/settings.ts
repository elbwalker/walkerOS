import { z } from '@walkeros/core/dev';

/**
 * Fingerprint transformer settings schema.
 *
 * Mirrors: types.ts FingerprintSettings
 */
export const SettingsSchema = z
  .object({
    fields: z
      .array(
        z.union([
          z
            .string()
            .describe('Dot-notation path: "ingest.ip", "event.data.userId"'),
          z
            .object({
              key: z.string().optional().describe('Source property path'),
              value: z
                .unknown()
                .optional()
                .describe('Static value or fallback'),
              fn: z
                .string()
                .optional()
                .describe('$code: function for value transformation'),
            })
            .describe('Mapping value config for computed fields'),
        ]),
      )
      .describe(
        'Fields to include in hash (order matters). Each resolved via getMappingValue with source { event, ingest }.',
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
    'Fingerprint transformer: generates deterministic user hashes from event fields',
  );

export type Settings = z.infer<typeof SettingsSchema>;
