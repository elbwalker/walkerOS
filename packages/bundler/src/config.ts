import { z } from 'zod';

// Template configuration schema
export const TemplateConfigSchema = z
  .object({
    content: z.string().optional(), // Inline template string
    file: z.string().optional(), // Path to template file
    variables: z
      .record(
        z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(
            z.union([
              z.string(),
              z.number(),
              z.boolean(),
              z.record(z.unknown()),
            ]),
          ),
        ]),
      )
      .optional(),
    bundlePlaceholder: z.string().optional().default('{{BUNDLE}}'),
    variablePattern: z
      .object({
        prefix: z.string().default('{{'),
        suffix: z.string().default('}}'),
      })
      .optional(),
  })
  .refine((data) => data.content || data.file, {
    message:
      "Either 'content' or 'file' must be provided for template configuration",
  });

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
  template: TemplateConfigSchema.optional(),
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

export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;
export type BuildConfig = z.infer<typeof BuildConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Validate and parse configuration
export function parseConfig(data: unknown): Config {
  return ConfigSchema.parse(data);
}
