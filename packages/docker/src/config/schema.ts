import { z } from 'zod';
import type { EnvironmentConfig } from '@walkeros/cli';

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
 * Complete configuration: CLI's EnvironmentConfig + Docker runtime config
 */
export interface Config extends EnvironmentConfig {
  docker?: DockerConfig;
}

/**
 * Parse Docker-specific configuration only
 */
export function parseDockerConfig(data: unknown): DockerConfig {
  const dockerData = (data as any)?.docker || {};
  return DockerConfigSchema.parse(dockerData);
}
