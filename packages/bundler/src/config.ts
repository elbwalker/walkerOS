import { z } from 'zod';

// Build configuration schema
export const BuildConfigSchema = z.object({
  platform: z.enum(['browser', 'node', 'neutral']).default('browser'),
  format: z.enum(['esm', 'cjs', 'umd', 'iife']).default('esm'),
  target: z.string().optional(),
  minify: z.boolean().default(false),
  sourcemap: z.boolean().default(false),
});

// Configuration schema
export const ConfigSchema = z.object({
  packages: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
    }),
  ),
  customCode: z.string(),
  build: BuildConfigSchema.default({}),
  output: z
    .object({
      filename: z.string().default('bundle.js'),
      dir: z.string().default('./dist'),
    })
    .default({
      filename: 'bundle.js',
      dir: './dist',
    }),
});

export type BuildConfig = z.infer<typeof BuildConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Validate and parse configuration
export function parseConfig(data: unknown): Config {
  return ConfigSchema.parse(data);
}
