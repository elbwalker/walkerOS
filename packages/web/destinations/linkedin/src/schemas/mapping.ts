import { z } from '@walkeros/core/dev';

/**
 * LinkedIn per-rule mapping schema.
 *
 * Every field on `conversion` is a walkerOS mapping value (static literal,
 * string path, or `{ map, value, key, fn, ... }` object). The schema uses
 * `z.unknown()` for each so users can supply any valid mapping shape; the
 * destination resolves it via `getMappingValue()` at push time.
 */
export const MappingSchema = z.object({
  conversion: z
    .unknown()
    .describe(
      'Resolves to a LinkedIn conversion object with short keys: { id (required number, the Campaign Manager conversion_id), value? (number), currency? (ISO code), eventId? (string, the same event id the server LinkedIn destination sends, for deduplication) }. A rule whose conversion resolves to no id makes no lintrk call and fails the push with missing-input.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
