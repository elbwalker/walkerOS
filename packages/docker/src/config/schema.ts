import { BundleConfigSchema } from '@walkeros/cli';
import { z } from 'zod';

/**
 * Docker-specific configuration extending CLI's BundleConfigSchema
 *
 * Note: Bundle/collect modes require full config from file.
 * Serve mode can run with minimal config (just docker.* fields).
 * Therefore, we make bundle-specific fields optional in the Docker schema.
 */
export const DockerConfigSchema = BundleConfigSchema.partial()
  .extend({
    docker: z
      .object({
        port: z.number().int().min(1).max(65535).default(8080),
        host: z.string().default('0.0.0.0'),

        // Collect mode settings
        collect: z
          .object({
            gracefulShutdown: z
              .number()
              .int()
              .min(1000)
              .max(300000)
              .default(25000)
              .describe('Graceful shutdown timeout in milliseconds'),
          })
          .optional(),

        // Serve mode settings
        serve: z
          .object({
            staticDir: z
              .string()
              .default('/app/dist')
              .describe('Static files directory'),
          })
          .optional(),

        // Bundle mode settings
        bundle: z
          .object({
            output: z
              .string()
              .default('/app/dist/walker.js')
              .describe('Bundle output path'),
          })
          .optional(),
      })
      .optional()
      .default({}),
  })
  .default({});

export type DockerConfig = z.infer<typeof DockerConfigSchema>;

/**
 * Parse and validate Docker configuration
 */
export function parseDockerConfig(data: unknown): DockerConfig {
  return DockerConfigSchema.parse(data);
}
