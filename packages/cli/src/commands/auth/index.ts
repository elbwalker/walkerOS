import { z } from 'zod';
import { handleCliError } from '../../core/api-error.js';
import { appErrorMessage, appFetch } from '../../core/app-fetch.js';
import { APP_PATHS } from '../../core/app-paths.js';
import { resolveAccessToken } from '../../core/auth.js';
import { createCLILogger } from '../../core/cli-logger.js';
import { writeResult } from '../../core/output.js';
import type { GlobalOptions } from '../../types/global.js';
import {
  EXIT,
  NOT_SIGNED_IN,
  type ApiCommandIO,
  type ApiExit,
} from '../api/index.js';

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
  const token = await resolveAccessToken();
  if (!token)
    throw new Error('Not authenticated. Run `walkeros auth login` first.');
  const response = await appFetch(APP_PATHS.whoami, { token });
  const body = await readJson(response);
  if (!response.ok)
    throw new Error(appErrorMessage(body) ?? `HTTP ${response.status}`);
  return body;
}

/**
 * Print the current access token and a newline on stdout, so any HTTP client
 * can call the app (`gh auth token` pattern). Exit 3 without a credential, 4
 * when a refresh cannot reach the app.
 */
export async function authTokenCommand(
  io: Pick<ApiCommandIO, 'stdout' | 'stderr'> = {
    stdout: process.stdout,
    stderr: process.stderr,
  },
): Promise<ApiExit> {
  let token: string | null;
  try {
    token = await resolveAccessToken();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`walkeros auth token: ${message}\n`);
    return EXIT.unreachable;
  }
  if (!token) {
    io.stderr.write(`walkeros auth token: ${NOT_SIGNED_IN}\n`);
    return EXIT.auth;
  }
  io.stdout.write(`${token}\n`);
  return EXIT.ok;
}

// === CLI Command Handler ===

const IdentitySchema = z.object({
  email: z.string().optional(),
  userId: z.string().optional(),
  projectId: z.string().nullish(),
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
      if (data.projectId) logger.info(`Project: ${data.projectId}`);
    }
  } catch (error) {
    handleCliError(error);
  }
}
