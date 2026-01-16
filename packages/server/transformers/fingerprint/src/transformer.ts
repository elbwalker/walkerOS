import type { Mapping, Transformer } from '@walkeros/core';
import { getMappingValue, setByPath } from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';
import type { FingerprintSettings } from './types';

/**
 * Fingerprint transformer - hash configurable fields for session continuity.
 *
 * Resolves fields from { event, ingest } source object using getMappingValue,
 * concatenates values in order, hashes with SHA-256, and stores at output path.
 *
 * @example
 * transformerFingerprint({
 *   config: {
 *     settings: {
 *       fields: [
 *         'ingest.ip',
 *         'ingest.userAgent',
 *         { fn: () => new Date().getDate() },
 *       ],
 *       output: 'user.hash',
 *       length: 16,
 *     },
 *   },
 * })
 */
export const transformerFingerprint: Transformer.Init<
  Transformer.Types<FingerprintSettings>
> = (context) => {
  const { config } = context;
  const settings = (config.settings || {}) as Partial<FingerprintSettings>;
  const fields: Mapping.Value[] = settings.fields || [];
  const output: string = settings.output || 'user.hash';
  const length: number | undefined = settings.length;

  return {
    type: 'fingerprint',
    config: config as Transformer.Config<
      Transformer.Types<FingerprintSettings>
    >,

    async push(event, context) {
      const { ingest, collector } = context;

      // Build source object for field resolution
      const source = { event, ingest };

      // Resolve each field via mapping (maintains order)
      const values = await Promise.all(
        fields.map((field: Mapping.Value) =>
          getMappingValue(source, field, { collector }),
        ),
      );

      // Safe string concatenation: '' prefix + String() cast for each value
      // '' prefix ensures we always have a string even if fields is empty
      // String(v ?? '') handles undefined/null gracefully
      const input = '' + values.map((v: unknown) => String(v ?? '')).join('');

      // Hash and store at output path
      const hash = await getHashServer(input, length);
      return setByPath(event, output, hash);
    },
  };
};
