import { apiRequest } from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { writeResult } from '../../core/output.js';
import type { GlobalOptions } from '../../types/global.js';

// === Programmatic API ===

export async function whoami(): Promise<unknown> {
  return apiRequest('/api/auth/whoami');
}

// === CLI Command Handler ===

export interface WhoamiCommandOptions extends GlobalOptions {
  json?: boolean;
  output?: string;
}

export async function whoamiCommand(
  options: WhoamiCommandOptions,
): Promise<void> {
  const logger = createCommandLogger(options);
  try {
    const result = await whoami();
    if (options.json) {
      await writeResult(JSON.stringify(result, null, 2), options);
    } else {
      const data = result as Record<string, unknown>;
      if (data.email) logger.log(`${data.email}`);
      if (data.userId) logger.log(`User: ${data.userId}`);
      if (data.projectId) logger.log(`Project: ${data.projectId}`);
    }
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
