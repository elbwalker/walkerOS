import { z } from 'zod';
import { handleCliError } from '../../core/api-error.js';
import {
  appErrorMessage,
  appFetch,
  appRequestUrl,
} from '../../core/app-fetch.js';
import { APP_PATHS } from '../../core/app-paths.js';
import {
  credentialAppUrl,
  credentialClient,
  refusalWritten,
  resolveCredential,
  sendWithCredential,
  type Credential,
} from '../../core/auth.js';
import { resolveAppUrl } from '../../lib/config-file.js';
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

/** The app refused WALKEROS_CREDENTIAL; its client already wrote the one line. */
class RefusedCredentialError extends Error {}

/** The app's answer, and the credential it answered for. */
async function identify(): Promise<{ body: unknown; credential: Credential }> {
  const appUrl = resolveAppUrl();
  const credential = await resolveCredential(appUrl);
  if (!credential) throw new Error(NOT_SIGNED_IN);
  const baseUrl = credentialAppUrl(credential, appUrl);
  const response = await sendWithCredential(
    credential,
    { method: 'GET', url: appRequestUrl(APP_PATHS.whoami, baseUrl) },
    (headers) => appFetch(APP_PATHS.whoami, { baseUrl, headers }),
  );
  const body = await readJson(response);
  if (!response.ok) {
    const message = appErrorMessage(body) ?? `HTTP ${response.status}`;
    if (refusalWritten(credential, response.status))
      throw new RefusedCredentialError(message);
    throw new Error(message);
  }
  return { body, credential };
}

/** Who the current credential belongs to, as the app answers it. */
export async function whoami(): Promise<unknown> {
  return (await identify()).body;
}

/** Where the credential comes from, as `walkeros auth whoami` names it. */
export function credentialSourceLine(credential: Credential): string {
  return credential.source === 'credential'
    ? 'Credential: WALKEROS_CREDENTIAL'
    : `Credential: signed in to ${credential.issuer}`;
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
    const { body: result, credential } = await identify();
    if (options.json) {
      await writeResult(JSON.stringify(result, null, 2), options);
    } else {
      const identity = IdentitySchema.safeParse(result);
      if (!identity.success) {
        logger.info(JSON.stringify(result));
      } else {
        const data = identity.data;
        if (data.email) logger.info(data.email);
        if (data.userId) logger.info(`User: ${data.userId}`);
      }
      logger.info(credentialSourceLine(credential));
    }
  } catch (error) {
    // One line per refusal: the credential's client wrote it.
    if (error instanceof RefusedCredentialError) process.exit(1);
    handleCliError(error);
  }
}

export interface TokenCommandIO {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
}

/**
 * `walkeros auth token`: one unbound 1-hour bearer of WALKEROS_CREDENTIAL on
 * stdout, nothing else, for `curl -H "Authorization: Bearer ..."`. Exit 1
 * with the fact on stderr when there is no credential or the auth server
 * gives no token; which credentials may buy one is the auth server's answer.
 */
export async function runAuthToken(
  io: TokenCommandIO = { stdout: process.stdout, stderr: process.stderr },
): Promise<number> {
  const fail = (text: string) => {
    io.stderr.write(`walkeros auth token: ${text}\n`);
    return 1;
  };
  try {
    const auth = credentialClient();
    if (!auth) return fail('WALKEROS_CREDENTIAL is not set');
    const { token } = await auth.token({ bound: false });
    io.stdout.write(`${token}\n`);
    return 0;
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}
