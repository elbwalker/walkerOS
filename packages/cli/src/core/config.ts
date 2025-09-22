import fs from 'fs-extra';
import path from 'path';

export function substituteEnvVariables(value: string): string {
  return value.replace(/\${([^}]+)}/g, (_, envVar) => {
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`Environment variable ${envVar} not found`);
    }
    return envValue;
  });
}

export async function loadJsonConfig<T>(configPath: string): Promise<T> {
  const absolutePath = path.resolve(configPath);

  if (!(await fs.pathExists(absolutePath))) {
    throw new Error(`Configuration file not found: ${absolutePath}`);
  }

  try {
    const rawConfig = await fs.readJson(absolutePath);
    return rawConfig as T;
  } catch (error) {
    throw new Error(
      `Invalid JSON in config file: ${configPath}. ${error instanceof Error ? error.message : error}`,
    );
  }
}

export function getTempDir(tempDir = '.tmp'): string {
  const randomId = Math.random().toString(36).substring(2, 11);
  return path.join(process.cwd(), tempDir, `cli-${Date.now()}-${randomId}`);
}
