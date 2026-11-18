import { z } from 'zod';
import { resolveAppUrl } from '../lib/config-file.js';
import { requireSecureUrl } from '../lib/secure-url.js';
import { clientContextHeaders } from './client-context.js';

export interface AppFetchInit {
  method?: string;
  /** The app, default `resolveAppUrl()`; trailing slashes are trimmed. */
  baseUrl?: string;
  headers?: Readonly<Record<string, string>>;
  body?: string;
  signal?: AbortSignal;
  redirect?: RequestRedirect;
  fetch?: typeof fetch;
}

const AppErrorSchema = z.object({
  error: z.object({ message: z.string().min(1) }),
});

/** The message of the app's error envelope `{ error: { message } }`, or undefined. */
export function appErrorMessage(body: unknown): string | undefined {
  const parsed = AppErrorSchema.safeParse(body);
  return parsed.success ? parsed.data.error.message : undefined;
}

/**
 * Call the walkerOS app. Every request carries the client-context headers
 * (`User-Agent`, `X-WalkerOS-Client`, `X-WalkerOS-Client-Version`); caller
 * headers, the credential's among them (`sendWithCredential`), win over them;
 * a request carrying Authorization goes only to a secure URL
 * (`requireSecureUrl`). `path` starts with `/` and may carry a query.
 */
/** The absolute URL of `path` at the app (`baseUrl`, default `resolveAppUrl()`). */
export function appRequestUrl(path: string, baseUrl?: string): string {
  return `${(baseUrl ?? resolveAppUrl()).replace(/\/+$/, '')}${path}`;
}

export async function appFetch(
  path: string,
  init: AppFetchInit = {},
): Promise<Response> {
  const url = appRequestUrl(path, init.baseUrl);
  const method = init.method ?? 'GET';
  const headers = new Headers(clientContextHeaders());
  for (const [name, value] of Object.entries(init.headers ?? {}))
    headers.set(name, value);
  if (headers.has('Authorization')) requireSecureUrl(url);
  const request: RequestInit = { headers };
  if (method !== 'GET') request.method = method;
  if (init.body !== undefined) request.body = init.body;
  if (init.signal) request.signal = init.signal;
  if (init.redirect) request.redirect = init.redirect;
  return (init.fetch ?? fetch)(url, request);
}
