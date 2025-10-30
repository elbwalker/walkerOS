import { z } from '@walkeros/core';
import { PixelId } from './primitives';

/**
 * Meta Pixel Settings Schema
 * Configuration for Meta (Facebook) Pixel destination
 */
export const SettingsSchema = z.object({
  pixelId: PixelId.describe(
    'Your Meta (Facebook) Pixel ID - a numeric identifier',
  ),
});

/**
 * Type inference from SettingsSchema
 */
export type Settings = z.infer<typeof SettingsSchema>;
