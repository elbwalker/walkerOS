import { z } from '@walkeros/core';
import { DataAttributePrefix } from './primitives';

/**
 * Tagger configuration schema
 * Used for automatic data attribute generation
 */
export const TaggerSchema = z.object({
  prefix: DataAttributePrefix.default('data-elb').describe(
    'Custom prefix for generated data attributes',
  ),
});

export type TaggerConfig = z.infer<typeof TaggerSchema>;
