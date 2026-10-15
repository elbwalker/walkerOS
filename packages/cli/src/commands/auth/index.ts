import { z } from 'zod';
import { handleCliError } from '../../core/api-error.js';
import { appErrorMessage, appFetch } from '../../core/app-fetch.js';
import { APP_PATHS } from '../../core/app-paths.js';
import { resolveAccessToken } from '../../core/auth.js';
import { createCLILogger } from '../../core/cli-logger.js';
import { writeResult } from '../../core/output.js';
import type { GlobalOptions } from '../../types/global.js';
import { NOT_SIGNED_IN } from '../api/index.js';

// === Programmatic API ===

/** The parsed JSON body, or null when the body is not JSON. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Who the current credential belongs to, as the app answers it. */
export async function whoami(): Promise<unknown> {
  const token = resolveAccessToken();
  if (!token) throw new Error(NOT_SIGNED_IN);
  const response = await appFetch(APP_PATHS.whoami, { token });
  const body = await readJson(response);
  if (!response.ok)
    throw new Error(appErrorMessage(body) ?? `HTTP ${response.status}`);
  return body;
}

// === CLI Command Handler ===

const IdentitySchema = z.object({
  email: z.string().optional(),
  userId: z.string().optional(),
});

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
      const identity = IdentitySchema.safeParse(result);
      if (!identity.success) {
        logger.info(JSON.stringify(result));
        return;
      }
      const data = identity.data;
      if (data.email) logger.info(data.email);
      if (data.userId) logger.info(`User: ${data.userId}`);
    }
  } catch (error) {
    handleCliError(error);
  }
}
