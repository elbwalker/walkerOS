import { z } from 'zod';
import type { BuildOptions } from '@walkeros/cli';
import type { Flow } from '@walkeros/core';

/**
 * Docker-specific runtime configuration
 * Only contains settings needed for Docker orchestration (HTTP server, file paths)
 */
export const DockerConfigSchema = z
  .object({
    port: z.number().int().min(1).max(65535).default(8080),
    host: z.string().default('0.0.0.0'),
    staticDir: z.string().default('/app/dist'),
  })
  .default({});

export type DockerConfig = z.infer<typeof DockerConfigSchema>;

/**
 * Complete configuration: flow + build + docker
 *
 * Combines runtime configuration (flow), build-time configuration (build),
 * and Docker-specific settings (docker).
 */
export interface Config {
  /**
   * Runtime event processing configuration
   */
  flow: Flow.Config;

  /**
   * Build-time configuration for bundling
   */
  build: BuildOptions;

  /**
   * Docker-specific runtime settings
   */
  docker?: DockerConfig;
}

/**
 * Parse Docker-specific configuration only
 */
export function parseDockerConfig(data: unknown): DockerConfig {
  const dockerData =
    typeof data === 'object' && data !== null && 'docker' in data
      ? (data as { docker?: unknown }).docker || {}
      : {};
  return DockerConfigSchema.parse(dockerData);
}
