import type { Logger, SendResponse } from '@walkeros/core';
import type { Env, Hit, PartialConfig } from './types';
import { resolveDestinationTimeout, StepError } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { bulkAnswerOf } from './answer';

/** One hit as a Tracking API request string, WHATWG form-encoded. */
export function toRequestString(hit: Hit): string {
  return `?${new URLSearchParams(hit).toString()}`;
}

/**
 * The bulk body, the only place the token goes (as token_auth): Matomo takes
 * a secure-only token only in a POST body, and no log line carries the body.
 */
export function toBody(hits: Hit[], token?: string): string {
  const requests = hits.map(toRequestString);
  return JSON.stringify(token ? { requests, token_auth: token } : { requests });
}

/** A failed request as Matomo's refusal: its status, never its body. */
function refusal(error: unknown): StepError {
  if (!(error instanceof StepError))
    return new StepError('Matomo request failed', {
      code: 'transport',
      cause: error,
    });
  if (error.status === undefined) return error;
  return new StepError(`Matomo refused the request (HTTP ${error.status})`, {
    code: 'transport',
    status: error.status,
    body: error.body,
  });
}

/**
 * Sends the event's hits as one bulk request and reads Matomo's counts: a
 * request Matomo does not track fails the push. QueuedTracking answers
 * without counts, so such a push is unconfirmed.
 */
export async function sendHits(
  endpoint: string,
  hits: Hit[],
  token: string | undefined,
  env: Env | undefined,
  config: Pick<PartialConfig, 'timeout'>,
  logger: Logger.Instance,
): Promise<{ tracked: number } | { unconfirmed: true }> {
  const sendServerFn = env?.sendServer || sendServer;

  let response: SendResponse;
  try {
    response = await sendServerFn(endpoint, toBody(hits, token), {
      timeout: resolveDestinationTimeout(config.timeout),
    });
  } catch (error) {
    throw refusal(error);
  }

  logger.debug('Matomo request sent', { endpoint, hits: hits.length });

  const answer = bulkAnswerOf(response.data);
  if (answer === 'unconfirmed') return { unconfirmed: true };
  if (answer === undefined)
    throw new StepError(
      'Matomo answered without its tracking counts: settings.url must be the Matomo base URL',
      { code: 'transport', retryable: false },
    );
  if (answer.tracked < hits.length)
    throw new StepError(
      `Matomo tracked ${answer.tracked} of ${hits.length} tracking requests (${answer.invalid} invalid): an unknown siteId, an invalid parameter, a repeated order ID, or one that needs token_auth`,
      {
        code: 'transport',
        // Only a request Matomo skipped on a lock wait may track on a retry.
        retryable: answer.tracked === 0 && answer.invalid === 0,
      },
    );
  return { tracked: answer.tracked };
}
