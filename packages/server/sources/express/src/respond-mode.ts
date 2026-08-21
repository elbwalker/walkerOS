import type { RouteMethod } from './types';

/**
 * Per-method respond-first defaults. GET is synchronous so a step (a file
 * transformer, a cache destination) can respond with real content before
 * the GIF fallback applies; POST is respond-first so ingestion acks fast
 * and delivers asynchronously.
 */
const METHOD_DEFAULTS: Record<RouteMethod, boolean> = {
  GET: false,
  POST: true,
};

/**
 * Resolves the effective respond-first flag for one request method from
 * `config.async`. A boolean applies to both methods; a record overrides per
 * method, with unset methods falling back to the method default; undefined
 * yields the method default.
 *
 * @param asyncConfig The source's `config.async` value.
 * @param method The request method to resolve for.
 * @returns Whether the handler responds before the push settles.
 */
export function resolveRespondFirst(
  asyncConfig: boolean | Record<string, boolean> | undefined,
  method: RouteMethod,
): boolean {
  if (asyncConfig === undefined) return METHOD_DEFAULTS[method];
  if (typeof asyncConfig === 'boolean') return asyncConfig;
  return asyncConfig[method] ?? METHOD_DEFAULTS[method];
}
