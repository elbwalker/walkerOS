import { z } from '@walkeros/core/dev';
import { PixelId } from './primitives';

export const SettingsSchema = z.object({
  pixelId: PixelId.describe(
    'Your Meta Pixel ID from Facebook Business Manager (like 1234567890)',
  ),
});

export type Settings = z.infer<typeof SettingsSchema>;
