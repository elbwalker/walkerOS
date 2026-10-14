import { z } from 'zod';
import { resolveAppUrl } from '../lib/config-file.js';
import { requireSecureUrl } from '../lib/secure-url.js';
import { clientContextHeaders } from './client-context.js';

export interface AppFetchInit {
  method?: string;
  /** The app, default `resolveAppUrl()`; trailing slashes are trimmed. */
  baseUrl?: string;
  /** Sent as `Authorization: Bearer <token>` unless the caller set Authorization. */
  token?: string | null;
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
 * headers win over them; a request carrying Authorization goes only to a
 * secure URL (`requireSecureUrl`). `path` starts with `/` and may carry a query.
 */
export async function appFetch(
  path: string,
  init: AppFetchInit = {},
): Promise<Response> {
  const url = `${(init.baseUrl ?? resolveAppUrl()).replace(/\/+$/, '')}${path}`;
  const headers = new Headers(clientContextHeaders());
  for (const [name, value] of Object.entries(init.headers ?? {}))
    headers.set(name, value);
  if (init.token && !headers.has('Authorization'))
    headers.set('Authorization', `Bearer ${init.token}`);
  if (headers.has('Authorization')) requireSecureUrl(url);
  const request: RequestInit = { headers };
  if (init.method && init.method !== 'GET') request.method = init.method;
  if (init.body !== undefined) request.body = init.body;
  if (init.signal) request.signal = init.signal;
  if (init.redirect) request.redirect = init.redirect;
  return (init.fetch ?? fetch)(url, request);
}
