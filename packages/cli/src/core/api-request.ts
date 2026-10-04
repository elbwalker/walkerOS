import type { paths } from '../types/api.gen.js';
import { resolveAppUrl, resolveDeployToken } from '../lib/config-file.js';
import { requireSecureUrl } from '../lib/secure-url.js';
import { resolveAccessToken } from './auth.js';
import { clientContextHeaders } from './client-context.js';
import { apiFetch, deployFetch, publicFetch } from './http.js';
import { parseOperation } from './openapi-subset.js';

type Method =
  | 'get'
  | 'put'
  | 'post'
  | 'delete'
  | 'options'
  | 'head'
  | 'patch'
  | 'trace';

/**
 * Every app operation a walkerOS client calls, as `"<METHOD> <path>"`. Derived
 * from the client subset of the contract (`openapi/client-operations.json`),
 * so an operation missing from that manifest is not a key here.
 */
export type OperationKey = {
  [P in keyof paths & string]: {
    [M in Method]: undefined extends paths[P][M]
      ? never
      : `${Uppercase<M>} ${P}`;
  }[Method];
}[keyof paths & string];

type OperationOf<K extends OperationKey> = K extends `${infer M} ${infer P}`
  ? P extends keyof paths
    ? NonNullable<paths[P][Lowercase<M> & keyof paths[P]]>
    : never
  : never;

type ParametersOf<K extends OperationKey> =
  OperationOf<K> extends { parameters: infer X } ? X : never;

type PathParams<K extends OperationKey> =
  ParametersOf<K> extends { path: infer X } ? X : never;

type QueryParams<K extends OperationKey> =
  ParametersOf<K> extends { query?: infer X } ? Exclude<X, undefined> : never;

type RequestBodyOf<K extends OperationKey> =
  OperationOf<K> extends { requestBody?: infer B }
    ? Exclude<B, undefined>
    : never;

type ContentOf<K extends OperationKey, Type extends string> = [
  RequestBodyOf<K>,
] extends [never]
  ? never
  : RequestBodyOf<K> extends { content: infer C }
    ? Type extends keyof C
      ? C[Type]
      : never
    : never;

type BodyRequired<K extends OperationKey> =
  OperationOf<K> extends { requestBody: unknown } ? true : false;

type PathInit<K extends OperationKey> = [PathParams<K>] extends [never]
  ? { path?: undefined }
  : { path: PathParams<K> };

type QueryInit<K extends OperationKey> = [QueryParams<K>] extends [never]
  ? { query?: undefined }
  : object extends QueryParams<K>
    ? { query?: QueryParams<K> }
    : { query: QueryParams<K> };

type JsonInit<K extends OperationKey> = [
  ContentOf<K, 'application/json'>,
] extends [never]
  ? { body?: undefined }
  : BodyRequired<K> extends true
    ? { body: ContentOf<K, 'application/json'> }
    : { body?: ContentOf<K, 'application/json'> };

type FormInit<K extends OperationKey> = [
  ContentOf<K, 'application/x-www-form-urlencoded'>,
] extends [never]
  ? { form?: undefined }
  : { form: ContentOf<K, 'application/x-www-form-urlencoded'> };

/**
 * Which credential a request carries:
 * - `'user'`: the access token (`WALKEROS_TOKEN`, then the stored session),
 *   only over a secure URL; without one the request goes out unauthenticated.
 * - `'deploy'`: the deploy token, then the access token; without either the
 *   request is refused.
 * - `'none'`: no credential.
 * - `{ token }`: exactly this bearer, only over a secure URL.
 */
export type ApiAuth = 'user' | 'deploy' | 'none' | { token: string };

/** How a request travels, independent of the operation. */
export interface ApiTransport {
  /** Default `'user'`. */
  auth?: ApiAuth;
  /** The app to call, without a trailing slash. Default `resolveAppUrl()`. */
  baseUrl?: string;
  /** Default the global `fetch`. */
  fetch?: typeof fetch;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
  redirect?: RequestRedirect;
}

/**
 * The request for one operation: its path parameters, query and body, each
 * typed from the contract, plus the transport.
 */
export type ApiRequestInit<K extends OperationKey> = ApiTransport &
  PathInit<K> &
  QueryInit<K> &
  JsonInit<K> &
  FormInit<K>;

type InitArgs<K extends OperationKey> =
  object extends ApiRequestInit<K>
    ? [init?: ApiRequestInit<K>]
    : [init: ApiRequestInit<K>];

type ResponsesOf<K extends OperationKey> =
  OperationOf<K> extends { responses: infer R } ? R : never;

/** The parsed JSON body of an operation's response with status `S`. */
export type ResponseJson<
  K extends OperationKey,
  S extends keyof ResponsesOf<K>,
> = ResponsesOf<K>[S] extends { content: { 'application/json': infer J } }
  ? J
  : never;

/** The untyped request shape every typed {@link ApiRequestInit} fits. */
interface RequestShape extends ApiTransport {
  path?: Readonly<Record<string, string | number>>;
  query?: Readonly<Record<string, unknown>>;
  body?: unknown;
  form?: Readonly<Record<string, unknown>>;
}

const DEPLOY_TOKEN_MISSING =
  'No authentication token available. Set WALKEROS_DEPLOY_TOKEN or run walkeros auth login.';

/**
 * The operation's path with each path parameter encoded once, plus the
 * serialized query. Query entries keep their order; `undefined` and `null`
 * values are left out, an array value repeats its key.
 */
function operationTarget(
  op: string,
  path: RequestShape['path'],
  query: RequestShape['query'],
): string {
  const template = parseOperation(op).path;
  const filled = template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = path?.[name];
    if (value === undefined) {
      throw new Error(`${op}: path parameter ${name} is missing`);
    }
    return encodeURIComponent(String(value));
  });
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      search.append(key, String(item));
    }
  }
  const serialized = search.toString();
  return serialized ? `${filled}?${serialized}` : filled;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

/** Later layers win; a name replaces the same name in any letter case. */
function mergeHeaders(
  ...layers: ReadonlyArray<Readonly<Record<string, string>>>
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const layer of layers) {
    for (const [name, value] of Object.entries(layer)) {
      const lower = name.toLowerCase();
      for (const existing of Object.keys(merged)) {
        if (existing.toLowerCase() === lower) delete merged[existing];
      }
      merged[name] = value;
    }
  }
  return merged;
}

function formBody(form: Readonly<Record<string, unknown>>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(form)) {
    if (value !== undefined && value !== null)
      params.append(key, String(value));
  }
  return params.toString();
}

/** Method, caller headers and serialized body, without any credential. */
function requestParts(
  op: string,
  init: RequestShape,
): { method: string; headers: Record<string, string>; body?: string } {
  const method = parseOperation(op).method.toUpperCase();
  const headers: Record<string, string> = { ...init.headers };
  if (init.form !== undefined) {
    if (!hasHeader(headers, 'Content-Type')) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    return { method, headers, body: formBody(init.form) };
  }
  if (init.body !== undefined) {
    if (!hasHeader(headers, 'Content-Type')) {
      headers['Content-Type'] = 'application/json';
    }
    return { method, headers, body: JSON.stringify(init.body) };
  }
  return { method, headers };
}

/**
 * Only what the request sets: a GET carries no `method`, a request without
 * headers no `headers`.
 */
function requestInit(
  parts: ReturnType<typeof requestParts>,
  init: RequestShape,
  headers: Record<string, string>,
): RequestInit {
  const request: RequestInit = {};
  if (parts.method !== 'GET') request.method = parts.method;
  if (Object.keys(headers).length > 0) request.headers = headers;
  if (parts.body !== undefined) request.body = parts.body;
  if (init.signal) request.signal = init.signal;
  if (init.redirect) request.redirect = init.redirect;
  return request;
}

async function credential(auth: ApiAuth): Promise<string | null> {
  if (auth === 'none') return null;
  if (auth === 'user') return resolveAccessToken();
  if (auth === 'deploy') {
    const token = resolveDeployToken() ?? (await resolveAccessToken());
    if (!token) throw new Error(DEPLOY_TOKEN_MISSING);
    return token;
  }
  return auth.token;
}

/**
 * Call one app operation. `op` names it as `"<METHOD> <path>"`; `path`,
 * `query` and `body` (or `form`) are typed from that operation, and the
 * result is the raw `Response`, whose parsed body {@link ResponseJson} types.
 *
 * Every request carries the client-context headers. Without `baseUrl` and
 * `fetch`, a `'user'`, `'deploy'` or `'none'` request goes through
 * `apiFetch`, `deployFetch` or `publicFetch`.
 */
export function apiRequest<K extends OperationKey>(
  op: K,
  ...init: InitArgs<K>
): Promise<Response>;
export async function apiRequest(
  op: OperationKey,
  init: RequestShape = {},
): Promise<Response> {
  const target = operationTarget(op, init.path, init.query);
  const parts = requestParts(op, init);
  const auth = init.auth ?? 'user';

  if (
    init.baseUrl === undefined &&
    init.fetch === undefined &&
    typeof auth === 'string'
  ) {
    const request = requestInit(parts, init, parts.headers);
    const send =
      auth === 'user'
        ? apiFetch
        : auth === 'deploy'
          ? deployFetch
          : publicFetch;
    return Object.keys(request).length > 0
      ? send(target, request)
      : send(target);
  }

  const url = `${init.baseUrl ?? resolveAppUrl()}${target}`;
  const token = await credential(auth);
  if (token) requireSecureUrl(url);
  const headers = mergeHeaders(
    clientContextHeaders(),
    parts.headers,
    token ? { Authorization: `Bearer ${token}` } : {},
  );
  const send = init.fetch ?? fetch;
  return send(url, requestInit(parts, init, headers));
}

/**
 * The absolute URL of one operation, for a caller that hands the URL to its
 * own transport (the telemetry destination).
 */
export function operationUrl<K extends OperationKey>(
  op: K,
  init: { baseUrl: string } & PathInit<K> & QueryInit<K>,
): string;
export function operationUrl(
  op: OperationKey,
  init: Pick<RequestShape, 'path' | 'query'> & { baseUrl: string },
): string {
  return `${init.baseUrl}${operationTarget(op, init.path, init.query)}`;
}
