import { z } from '@walkeros/core/dev';

/**
 * File transformer settings schema.
 *
 * Mirrors: types.ts FileSettings
 */
export const SettingsSchema = z
  .object({
    prefix: z
      .string()
      .optional()
      .describe(
        'URL prefix to strip before store lookup. E.g., "/static" → /static/walker.js looks up "walker.js"',
      ),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'Default response headers (e.g., Cache-Control, X-Frame-Options)',
      ),
    mimeTypes: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'Extension → Content-Type overrides. Keys include dot: { ".wasm": "application/wasm" }',
      ),
  })
  .describe(
    'File transformer: serves static files via pluggable Store backend',
  );

export type Settings = z.infer<typeof SettingsSchema>;
