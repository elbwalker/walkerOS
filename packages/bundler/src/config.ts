import { z } from 'zod';

// Configuration schema
export const ConfigSchema = z.object({
  packages: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
    }),
  ),
  customCode: z.string(),
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

export type Config = z.infer<typeof ConfigSchema>;

// Validate and parse configuration
export function parseConfig(data: unknown): Config {
  return ConfigSchema.parse(data);
}
