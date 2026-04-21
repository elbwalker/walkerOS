import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  filename: z
    .union([
      z.string().describe('Static output filename.'),
      z
        .record(z.string(), z.unknown())
        .describe(
          'Mapping.Value resolved per event (e.g. { key: "data.tenant" } or { fn: "$code:..." }).',
        ),
    ])
    .describe(
      'Output filename. Static string or Mapping.Value (e.g. { fn: "$code:..." } for daily rotation, { key: "data.tenant" } for sharding).',
    ),
  format: z
    .enum(['jsonl', 'tsv', 'csv'])
    .optional()
    .describe('Serialisation format. Defaults to jsonl.'),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      'Event paths used as columns for tsv/csv formats. Object values are JSON-stringified. Required when format is tsv or csv.',
    ),
});

export type Settings = z.infer<typeof SettingsSchema>;
