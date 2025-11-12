import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM-compatible __dirname resolution
// Use a function to get the directory path that works in both ESM and CommonJS
function getDirname(): string {
  // Check if we're in an ESM context by checking if __dirname is undefined
  // In ESM, __dirname doesn't exist; in CommonJS, it's defined globally
  // @ts-ignore - __dirname may not exist in ESM
  if (typeof __dirname === 'undefined') {
    // ESM context - use import.meta.url
    // @ts-ignore - import.meta only exists in ESM
    return dirname(fileURLToPath(import.meta.url));
  }
  // CommonJS context
  return __dirname;
}

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
function createBuildConfigSchema(platform: 'web' | 'server') {
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
      globalName: z.string().optional(),
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
      globalName: z.string().optional(),
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
  globalName: z.string().optional(),
});

// Collector configuration schema - matches walkerOS Collector.Config interface
const CollectorConfigSchema = z
  .object({
    run: z.boolean().optional(),
    consent: z.record(z.boolean()).optional(),
    user: z
      .object({
        id: z.string().optional(),
        device: z.string().optional(),
        session: z.string().optional(),
      })
      .optional(),
    globals: z.record(z.unknown()).optional(),
    globalsStatic: z.record(z.unknown()).optional(),
    sessionStatic: z.record(z.unknown()).optional(),
    custom: z.record(z.unknown()).optional(),
    verbose: z.boolean().optional(),
    tagging: z.number().optional(),
  })
  .optional();

// Configuration schema
export const BundleConfigSchema = z.object({
  platform: z.enum(['web', 'server']).default('web'),
  packages: z.record(z.string(), PackageConfigSchema.default({})),
  code: z.string(),
  template: z.string().optional(),
  build: BuildConfigSchema.default({}),
  output: z.string().default('./dist/bundle.js'),
  sources: z.record(z.string(), SourceDestinationItemSchema).optional(),
  destinations: z.record(z.string(), SourceDestinationItemSchema).optional(),
  collector: CollectorConfigSchema,
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

  // Auto-select template based on platform if not specified
  let template = parsed.template;
  if (!template && parsed.platform === 'server') {
    // Use server.hbs template for server platform
    // Use path resolution that works both in bundled and unbundled contexts
    template = path.join(getDirname(), '../templates/server.hbs');
  } else if (!template && parsed.platform === 'web') {
    // Use base.hbs template for web platform
    template = path.join(getDirname(), '../templates/base.hbs');
  }

  return {
    ...parsed,
    template,
    build: {
      ...platformBuildDefaults,
      ...parsed.build,
    },
  };
}
