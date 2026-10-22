import type { SendDataValue, SendHeaders, SendResponse } from '@walkeros/core';
import {
  getHeaders,
  networkErrorMessage,
  StepError,
  transformData,
  tryCatch,
} from '@walkeros/core';

export type SendWebTransport = 'fetch' | 'beacon' | 'xhr';

export interface SendWebOptions {
  headers?: SendHeaders;
  transport?: SendWebTransport;
  method?: string;
}

export interface SendWebOptionsFetch extends SendWebOptions {
  credentials?: 'omit' | 'same-origin' | 'include'; // Add credentials option
  noCors?: boolean; // Add noCors option for fetch transport
  timeout?: number; // Abort the request after this many ms (default 10000)
}

const DEFAULT_FETCH_TIMEOUT = 10000;

/** Keepalive and beacon bodies a browser accepts in flight per page. */
const KEEPALIVE_LIMIT = 64 * 1024;

/** Bytes of the keepalive fetches in flight on this page. */
let keepaliveBytes = 0;

type SendWebOptionsDynamic<T extends SendWebTransport> = T extends 'fetch'
  ? SendWebOptionsFetch
  : SendWebOptions;

export type SendWebReturn<T extends SendWebTransport> = T extends 'fetch'
  ? Promise<SendResponse>
  : SendResponse;

/**
 * Send a request with `fetch` (default), `navigator.sendBeacon` or a
 * synchronous XHR. Resolves (fetch) or returns (beacon, xhr) `{ data }` when
 * the request was sent, and throws a `StepError` otherwise: `transport` with
 * `status` and `body` for a non-2xx answer or a network error, `timeout` for
 * a fetch past its timeout, `beacon-rejected` when the browser refuses a
 * beacon. The body stays on the error, never in its message.
 */
export function sendWeb<T extends SendWebTransport>(
  url: string,
  data?: SendDataValue,
  options: SendWebOptionsDynamic<T> & { transport?: T } = {
    transport: 'fetch' as T,
  },
): SendWebReturn<T> {
  const transport = options.transport || 'fetch';

  switch (transport) {
    case 'beacon':
      return sendWebAsBeacon(url, data) as SendWebReturn<T>;
    case 'xhr':
      return sendWebAsXhr(url, data, options) as SendWebReturn<T>;
    case 'fetch':
    default:
      return sendWebAsFetch(url, data, options) as SendWebReturn<T>;
  }
}

export async function sendWebAsFetch(
  url: string,
  data?: SendDataValue,
  options: SendWebOptionsFetch = {},
): Promise<SendResponse> {
  const headers = getHeaders(options.headers);
  const body = transformData(data);
  const requested = options.timeout;
  const timeout =
    typeof requested === 'number' && Number.isFinite(requested) && requested > 0
      ? requested
      : DEFAULT_FETCH_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Browsers refuse a keepalive request once the keepalive bodies in flight
  // exceed 64 KiB; past that a request goes out without keepalive instead.
  const size = body ? byteLength(body) : 0;
  const keepalive = keepaliveBytes + size <= KEEPALIVE_LIMIT;
  if (keepalive) keepaliveBytes += size;

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method || 'POST',
        headers,
        keepalive,
        credentials: options.credentials || 'same-origin',
        mode: options.noCors ? 'no-cors' : 'cors',
        body,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted)
        throw new StepError(`Request timed out after ${timeout}ms`, {
          code: 'timeout',
          cause: error,
        });
      throw new StepError(networkErrorMessage(error), {
        code: 'transport',
        cause: error,
      });
    }

    // A no-cors response is opaque: it counts as sent once it arrived.
    if (options.noCors) return { data: '' };

    const responseData = await response.text();
    if (!response.ok)
      throw new StepError(`HTTP ${response.status}`, {
        code: 'transport',
        status: response.status,
        body: responseData,
      });

    return { data: responseData };
  } finally {
    clearTimeout(timeoutId);
    if (keepalive) keepaliveBytes -= size;
  }
}

export function sendWebAsBeacon(
  url: string,
  data?: SendDataValue,
): SendResponse {
  const body = transformData(data);

  if (!navigator.sendBeacon(url, body)) {
    // Over the browser's 64 KiB quota a retry cannot help; a full queue can.
    const size = body ? byteLength(body) : 0;
    throw new StepError('Beacon rejected by the browser', {
      code: 'beacon-rejected',
      retryable: size <= KEEPALIVE_LIMIT,
    });
  }

  return {};
}

export function sendWebAsXhr(
  url: string,
  data?: SendDataValue,
  options: SendWebOptions = {},
): SendResponse {
  const headers = getHeaders(options.headers);
  const method = options.method || 'POST';
  const body = transformData(data);

  let xhr: XMLHttpRequest;
  try {
    xhr = new XMLHttpRequest();
    xhr.open(method, url, false); // Synchronous request
    for (const header in headers) {
      xhr.setRequestHeader(header, headers[header]);
    }
    xhr.send(body);
  } catch (error) {
    throw new StepError(networkErrorMessage(error), {
      code: 'transport',
      cause: error,
    });
  }

  const parsedData: unknown = tryCatch(
    JSON.parse,
    () => xhr.response,
  )(xhr.response);

  if (xhr.status < 200 || xhr.status >= 300)
    throw new StepError(`HTTP ${xhr.status}`, {
      code: 'transport',
      status: xhr.status || undefined,
      body: parsedData,
    });

  return { data: parsedData };
}

/** UTF-8 length of a request body, without TextEncoder. */
function byteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++; // The low surrogate belongs to this character.
    } else bytes += 3;
  }
  return bytes;
}
