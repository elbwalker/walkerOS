import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    contract: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe(
        'Validation constraints. Each entry is a resolved $contract.* rule (with entity-action `events` schemas and/or a full-event `schema`) or an inline whole-event JSON Schema. All entries are AND-ed; every error is aggregated.',
      ),
    format: z
      .boolean()
      .optional()
      .describe(
        'When true, also validate the canonical WalkerOS.Event structural shape (correct field types, no unknown fields). All fields are optional, so this checks structure and types, not presence.',
      ),
    mode: z
      .enum(['strict', 'pass'])
      .optional()
      .describe(
        '`strict` drops invalid events (chain-stop) after recording errors; `pass` annotates and continues. Default `pass`.',
      ),
    output: z
      .object({
        isValid: z
          .string()
          .optional()
          .describe(
            'Event dot-path for the boolean verdict. Default `source.valid`. Empty string = skip.',
          ),
        errors: z
          .string()
          .optional()
          .describe(
            'Ingest dot-path for the issue list. Default `validation`. Empty string = skip.',
          ),
      })
      .optional()
      .describe(
        'Where the verdict (on the event) and the issue list (on the ingest) are written.',
      ),
  })
  .describe(
    'Validate transformer: checks events against JSON Schema contracts and annotates a verdict on the event plus issues on the ingest.',
  );

export type Settings = z.infer<typeof SettingsSchema>;
