import { z } from 'zod';
import { loadJsonConfig, substituteEnvVariables } from '../core';
import type { DeployerConfig } from './types';

const DriverConfigSchema = z.object({
  type: z.enum(['host', 'ingest']),
  credentials: z.record(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
  artifactPath: z.string().optional(),
});

const DeployerConfigSchema = z.object({
  drivers: z.record(DriverConfigSchema).optional(),
});

export async function loadDeployConfig(
  configPath: string,
): Promise<DeployerConfig> {
  const rawConfig = await loadJsonConfig(configPath);

  const result = DeployerConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    throw new Error(`Invalid deploy config: ${result.error.message}`);
  }

  return result.data;
}

export function processDeployConfig(config: DeployerConfig): DeployerConfig {
  const processed = { ...config };

  if (processed.drivers) {
    Object.entries(processed.drivers).forEach(([name, driver]) => {
      if (driver.credentials) {
        const processedCredentials: Record<string, string> = {};
        Object.entries(driver.credentials).forEach(([key, value]) => {
          processedCredentials[key] = substituteEnvVariables(value);
        });
        processed.drivers![name].credentials = processedCredentials;
      }
    });
  }

  return processed;
}
