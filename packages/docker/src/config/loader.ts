import fs from 'fs/promises';
import path from 'path';
import { parseDockerConfig, type Config } from './schema';

/**
 * Load and parse Docker configuration from file
 * Extracts flow, build, and docker sections
 * CLI functions will validate flow/build when they're used
 */
export async function loadDockerConfig(configPath?: string): Promise<Config> {
  // Simple default: Use demo.json if no FLOW specified
  const filePath = configPath || process.env.FLOW || '/app/flows/demo.json';

  const resolvedPath = path.resolve(filePath);

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const rawConfig = JSON.parse(content);

    // Substitute environment variables
    const substituted = substituteEnvVars(rawConfig) as Record<string, unknown>;

    // Extract sections (CLI will validate flow/build when used)
    const flowConfig = (substituted.flow || {}) as Config['flow'];
    const buildConfig = (substituted.build || {}) as Config['build'];
    const dockerConfig = parseDockerConfig(substituted);

    return {
      flow: flowConfig,
      build: buildConfig,
      docker: dockerConfig,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`❌ Flow config not found: ${resolvedPath}`);
      console.error('   Built-in flows:');
      // List available flows
      const flowsDir = '/app/flows';
      try {
        const files = await fs.readdir(flowsDir);
        files.forEach((f) => console.error(`     /app/flows/${f}`));
      } catch {
        console.error('     (flows directory not found)');
      }
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Recursively substitute environment variables in configuration
 * Replaces ${VAR_NAME} or ${VAR_NAME:default} with process.env.VAR_NAME
 * Supports type coercion: numbers are parsed as numbers
 */
function substituteEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(
      /\$\{([^}:]+)(?::([^}]+))?\}/g,
      (match, varName, defaultValue) => {
        const value = process.env[varName] || defaultValue;
        if (value === undefined) {
          throw new Error(
            `Environment variable ${varName} not found and no default provided (referenced in config)`,
          );
        }
        // Try to parse as number if it looks like one
        const numValue = Number(value);
        return !isNaN(numValue) && value.trim() !== '' ? numValue : value;
      },
    );
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => substituteEnvVars(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVars(value);
    }
    return result;
  }

  return obj;
}
