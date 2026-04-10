import { z } from '@walkeros/core/dev';

/**
 * LinkedIn per-rule mapping schema.
 *
 * Every field on `conversion` is a walkerOS mapping value (static literal,
 * string path, or `{ map, value, key, fn, ... }` object). The schema uses
 * `z.unknown()` for each so users can supply any valid mapping shape — the
 * destination resolves it via `getMappingValue()` at push time.
 */
export const MappingSchema = z.object({
  conversion: z
    .unknown()
    .describe(
      'Resolves to a LinkedIn conversion object with short keys: { id (required number — the Campaign Manager conversion_id), value? (number), currency? (ISO code), eventId? (string for deduplication with a future server/Conversions API destination) }. Events without a resolved id are silently ignored.',
    )
    .optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
