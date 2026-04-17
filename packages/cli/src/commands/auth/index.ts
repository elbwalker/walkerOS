import { createApiClient } from '../../core/api-client.js';
import { handleCliError } from '../../core/api-error.js';
import { createCLILogger } from '../../core/cli-logger.js';
import { writeResult } from '../../core/output.js';
import type { GlobalOptions } from '../../types/global.js';

// === Programmatic API ===

export async function whoami() {
  const client = createApiClient();
  const { data, error } = await client.GET('/api/auth/whoami');
  if (error) throw new Error(error.error?.message || 'Not authenticated');
  return data;
}

// === CLI Command Handler ===

export interface WhoamiCommandOptions extends GlobalOptions {
  json?: boolean;
  output?: string;
}

export async function whoamiCommand(
  options: WhoamiCommandOptions,
): Promise<void> {
  const logger = createCLILogger(options);
  try {
    const result = await whoami();
    if (options.json) {
      await writeResult(JSON.stringify(result, null, 2), options);
    } else {
      const data = result as Record<string, unknown>;
      if (data.email) logger.info(`${data.email}`);
      if (data.userId) logger.info(`User: ${data.userId}`);
      if (data.projectId) logger.info(`Project: ${data.projectId}`);
    }
  } catch (error) {
    handleCliError(error);
  }
}
