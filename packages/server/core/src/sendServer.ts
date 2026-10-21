import type { SendDataValue, SendHeaders, SendResponse } from '@walkeros/core';
import {
  getHeaders,
  networkErrorMessage,
  StepError,
  transformData,
  tryCatch,
} from '@walkeros/core';

export interface SendServerOptions {
  headers?: SendHeaders;
  method?: string;
  timeout?: number;
}

/** Methods whose request carries no body (fetch refuses one). */
const NO_BODY_METHODS = ['GET', 'HEAD'];

/**
 * Send a request with the global `fetch`. Resolves `{ data }` (the body,
 * parsed as JSON where it parses) for a 2xx answer and throws a `StepError`
 * otherwise: `transport` with `status` and `body` for any other status or a
 * network error, `timeout` when no answer arrives within `options.timeout`
 * (default 5000 ms), `config` for an invalid URL. The body stays on the error,
 * never in its message.
 */
export async function sendServer(
  url: string,
  data?: SendDataValue,
  options: SendServerOptions = {},
): Promise<SendResponse> {
  const headers = getHeaders(options.headers);
  const method = options.method || 'POST';
  const timeout = options.timeout || 5000;
  const body = NO_BODY_METHODS.includes(method.toUpperCase())
    ? undefined
    : transformData(data);

  try {
    new URL(url);
  } catch (err) {
    throw new StepError('Invalid request URL', {
      code: 'config',
      retryable: false,
      cause: err,
    });
  }

  // Own timer, so a request that ignores the abort signal still settles.
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new StepError(`Request timed out after ${timeout}ms`, {
          code: 'timeout',
        }),
      );
    }, timeout);
  });

  try {
    return await Promise.race([
      request(url, { method, headers, body, signal: controller.signal }),
      timedOut,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function request(url: string, init: RequestInit): Promise<SendResponse> {
  let response: Response;
  try {
    // Read at call time, so a replaced global fetch is the one used.
    response = await globalThis.fetch(url, init);
  } catch (err) {
    throw new StepError(networkErrorMessage(err), {
      code: 'transport',
      cause: err,
    });
  }

  const text = await response.text();
  const parsed: unknown = tryCatch(JSON.parse, () => text)(text);

  if (!response.ok)
    throw new StepError(`HTTP ${response.status}`, {
      code: 'transport',
      status: response.status,
      body: parsed,
    });

  return { data: parsed };
}
