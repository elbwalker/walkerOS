import { z } from 'zod';

// Package configuration schema
const PackageConfigSchema = z.object({
  version: z.string().default('latest'),
  imports: z.array(z.string()).optional(),
});

// Source/Destination item schema
const SourceDestinationItemSchema = z.object({
  code: z.string(),
  config: z.record(z.unknown()).optional(),
  env: z.unknown().optional(),
});

// Build configuration schema with platform-specific defaults
function createBuildConfigSchema(platform: 'web' | 'node') {
  if (platform === 'web') {
    return z.object({
      platform: z.enum(['browser', 'node', 'neutral']).default('browser'),
      format: z.enum(['esm', 'cjs', 'umd', 'iife']).default('iife'),
      target: z.string().default('es2020'),
      minify: z.boolean().default(false),
      minifyOptions: z
        .object({
          whitespace: z.boolean().default(true),
          identifiers: z.boolean().default(true),
          syntax: z.boolean().default(true),
          legalComments: z
            .enum(['none', 'inline', 'eof', 'linked', 'external'])
            .default('none'),
          keepNames: z.boolean().default(false),
        })
        .optional(),
      sourcemap: z.boolean().default(true),
    });
  } else {
    return z.object({
      platform: z.enum(['browser', 'node', 'neutral']).default('node'),
      format: z.enum(['esm', 'cjs', 'umd', 'iife']).default('cjs'),
      target: z.string().default('node18'),
      minify: z.boolean().default(false),
      minifyOptions: z
        .object({
          whitespace: z.boolean().default(true),
          identifiers: z.boolean().default(true),
          syntax: z.boolean().default(true),
          legalComments: z
            .enum(['none', 'inline', 'eof', 'linked', 'external'])
            .default('none'),
          keepNames: z.boolean().default(false),
        })
        .optional(),
      sourcemap: z.boolean().default(false),
    });
  }
}

export const BuildConfigSchema = z.object({
  platform: z.enum(['browser', 'node', 'neutral']).default('browser'),
  format: z.enum(['esm', 'cjs', 'umd', 'iife']).default('esm'),
  target: z.string().optional(),
  minify: z.boolean().default(false),
  minifyOptions: z
    .object({
      whitespace: z.boolean().default(true),
      identifiers: z.boolean().default(true),
      syntax: z.boolean().default(true),
      legalComments: z
        .enum(['none', 'inline', 'eof', 'linked', 'external'])
        .default('none'),
      keepNames: z.boolean().default(false),
    })
    .optional(),
  sourcemap: z.boolean().default(false),
});

// Configuration schema
export const BundleConfigSchema = z.object({
  platform: z.enum(['web', 'node']).default('web'),
  packages: z.record(z.string(), PackageConfigSchema.default({})),
  code: z.string(),
  template: z.string().optional(),
  build: BuildConfigSchema.default({}),
  output: z.string().default('./dist/bundle.js'),
  sources: z.record(z.string(), SourceDestinationItemSchema).optional(),
  destinations: z.record(z.string(), SourceDestinationItemSchema).optional(),
  collector: z.record(z.unknown()).optional(),
  tempDir: z
    .string()
    .default('.tmp')
    .describe('Directory for temporary files during bundling'),
  cache: z
    .boolean()
    .default(true)
    .describe('Enable package caching to speed up subsequent builds'),
});

export type BuildConfig = z.infer<typeof BuildConfigSchema>;
export type BundleConfig = z.infer<typeof BundleConfigSchema>;
export type PackageConfig = z.infer<typeof PackageConfigSchema>;
export type SourceDestinationItem = z.infer<typeof SourceDestinationItemSchema>;

// Validate and parse configuration with platform-specific build defaults
export function parseBundleConfig(data: unknown): BundleConfig {
  const parsed = BundleConfigSchema.parse(data);

  // Apply platform-specific build defaults
  const platformBuildDefaults = createBuildConfigSchema(parsed.platform).parse(
    {},
  );

  return {
    ...parsed,
    build: {
      ...platformBuildDefaults,
      ...parsed.build,
    },
  };
}
