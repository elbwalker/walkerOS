import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import type { Command, CommanderError } from 'commander';
import { z } from 'zod';
import { appErrorMessage, appFetch } from '../../core/app-fetch.js';
import { APP_PATHS } from '../../core/app-paths.js';
import { resolveAccessToken } from '../../core/auth.js';
import { fetchFailureReason } from '../../core/fetch-failure.js';
import { readStdin } from '../../core/stdin.js';
import { resolveAppUrl } from '../../lib/config-file.js';
import { requireSecureUrl } from '../../lib/secure-url.js';

/**
 * `walkeros api <METHOD> <path>`: one authenticated request to the walkerOS
 * app, its answer copied to stdout as it arrives. The CLI knows no operation
 * of the app beyond its own fixed ones; the person names the path.
 */

export const EXIT = {
  ok: 0,
  http: 1,
  usage: 2,
  auth: 3,
  unreachable: 4,
} as const;
export type ApiExit = (typeof EXIT)[keyof typeof EXIT];

export interface ApiCommandIO {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  stdin: NodeJS.ReadableStream;
}

export interface ApiRequestOptions {
  method: string;
  /** Starts with `/`; query parameters ride in it. */
  path: string;
  /** `'<json>'`, `'@file.json'` or `'-'` (stdin). */
  data?: string;
  /** Each `'Name: value'`; repeatable. */
  header: string[];
  /** Fills `{projectId}`; falls back to WALKEROS_PROJECT_ID. */
  project?: string;
  yes?: boolean;
}

/** Shown when there is no credential to send. */
export const NOT_SIGNED_IN =
  'no token: set WALKEROS_TOKEN to a token from Account > Automation tokens in the walkerOS app';

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
/** Error bodies are read back for the stderr line; a bigger one is not parsed. */
const ERROR_BODY_LIMIT = 64 * 1024;

class UsageError extends Error {}

function defaultIO(): ApiCommandIO {
  return {
    stdout: process.stdout,
    stderr: process.stderr,
    stdin: process.stdin,
  };
}

function line(out: NodeJS.WritableStream, text: string): void {
  out.write(`walkeros api: ${text}\n`);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}

/** The origin of a URL for a message, or the URL itself when it is not one. */
function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function fillPath(path: string, project: string | undefined): string {
  if (!path.startsWith('/'))
    throw new UsageError(`the path must start with /: ${path}`);
  let filled = path;
  if (filled.includes('{projectId}')) {
    if (!project)
      throw new UsageError(
        '{projectId} needs --project or WALKEROS_PROJECT_ID',
      );
    filled = filled.split('{projectId}').join(encodeURIComponent(project));
  }
  const left = /\{[^}]+\}/.exec(filled);
  if (left) throw new UsageError(`fill ${left[0]} in the path`);
  return filled;
}

function parseHeaders(values: readonly string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const value of values) {
    const colon = value.indexOf(':');
    if (colon <= 0) throw new UsageError(`a header is 'Name: value': ${value}`);
    const name = value.slice(0, colon).trim();
    if (name.toLowerCase() === 'authorization')
      throw new UsageError(
        'set the token with WALKEROS_TOKEN, not with an Authorization header',
      );
    headers[name] = value.slice(colon + 1).trim();
  }
  return headers;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

/** The body as given: the argument, a file's content, or stdin. */
async function readData(
  data: string,
  stdin: NodeJS.ReadableStream,
): Promise<string> {
  if (data === '-') {
    try {
      return await readStdin(stdin);
    } catch (error) {
      throw new UsageError(`--data -: ${messageOf(error)}`);
    }
  }
  if (data.startsWith('@')) {
    const file = data.slice(1);
    try {
      return await readFile(file, 'utf-8');
    } catch (error) {
      throw new UsageError(
        `cannot read the --data file ${file}: ${messageOf(error)}`,
      );
    }
  }
  return data;
}

interface PreparedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string;
}

/** Every usage check, in order, before anything is resolved or sent. */
async function prepare(
  options: ApiRequestOptions,
  stdin: NodeJS.ReadableStream,
): Promise<PreparedRequest> {
  const method = options.method.toUpperCase();
  if (!METHODS.has(method))
    throw new UsageError(
      `unknown method ${options.method}: use GET, POST, PUT, PATCH or DELETE`,
    );
  if (method === 'DELETE' && !options.yes)
    throw new UsageError('DELETE needs --yes');
  if (method === 'GET' && options.data !== undefined)
    throw new UsageError('GET takes no --data');
  const path = fillPath(
    options.path,
    options.project || process.env.WALKEROS_PROJECT_ID,
  );
  const headers = parseHeaders(options.header);
  if (options.data === undefined) return { method, path, headers };
  const body = await readData(options.data, stdin);
  if (!hasHeader(headers, 'Content-Type'))
    headers['Content-Type'] = 'application/json';
  return { method, path, headers, body };
}

/** Copy the answer to stdout as it arrives; keep an error body for the stderr line. */
async function relay(response: Response, io: ApiCommandIO): Promise<ApiExit> {
  const kept: Uint8Array[] = [];
  let keptBytes = 0;
  try {
    const reader = response.body?.getReader();
    for (;;) {
      if (!reader) break;
      const { done, value } = await reader.read();
      if (done) break;
      if (!io.stdout.write(value)) await once(io.stdout, 'drain');
      if (!response.ok && keptBytes < ERROR_BODY_LIMIT) {
        kept.push(value);
        keptBytes += value.byteLength;
      }
    }
  } catch (error) {
    line(
      io.stderr,
      `the connection broke while reading the answer: ${fetchFailureReason(error)}`,
    );
    return EXIT.unreachable;
  }
  if (response.ok) return EXIT.ok;
  const message = appErrorMessage(
    parseJson(Buffer.concat(kept).toString('utf-8')),
  );
  line(
    io.stderr,
    `HTTP ${response.status} ${response.statusText}`.trimEnd() +
      (message ? `: ${message}` : ''),
  );
  return response.status === 401 ? EXIT.auth : EXIT.http;
}

/**
 * Send one request to the app and print its answer. Exit 0 for 2xx, 1 for any
 * other status, 2 for a usage error (nothing sent), 3 without a credential or
 * on 401, 4 when the app cannot be reached or the answer breaks off.
 */
export async function runApi(
  options: ApiRequestOptions,
  io: ApiCommandIO = defaultIO(),
): Promise<ApiExit> {
  let request: PreparedRequest;
  try {
    request = await prepare(options, io.stdin);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    line(io.stderr, error.message);
    return EXIT.usage;
  }

  const token = resolveAccessToken();
  if (!token) {
    line(io.stderr, NOT_SIGNED_IN);
    return EXIT.auth;
  }

  const appUrl = resolveAppUrl();
  try {
    requireSecureUrl(`${appUrl.replace(/\/+$/, '')}${request.path}`);
  } catch (error) {
    line(io.stderr, messageOf(error));
    return EXIT.usage;
  }

  let response: Response;
  try {
    response = await appFetch(request.path, {
      method: request.method,
      baseUrl: appUrl,
      token,
      headers: request.headers,
      body: request.body,
    });
  } catch (error) {
    line(
      io.stderr,
      `could not reach ${originOf(appUrl)}: ${fetchFailureReason(error)}`,
    );
    return EXIT.unreachable;
  }
  return relay(response, io);
}

export interface ApiOperation {
  /** Upper case. */
  method: string;
  path: string;
  summary?: string;
  description?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
}

export interface ApiListOptions {
  filter?: string;
  json?: boolean;
}

const OPERATION_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'patch',
  'head',
  'options',
] as const;

const DocumentSchema = z.object({
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
  components: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional(),
});

const OperationSchema = z.object({
  summary: z.string().optional(),
  description: z.string().optional(),
  parameters: z.array(z.unknown()).optional(),
  requestBody: z.unknown().optional(),
  responses: z.record(z.string(), z.unknown()).optional(),
});

const COMPONENT_REF = /^#\/components\/([^/]+)\/([^/]+)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Every operation of an OpenAPI document, sorted by path, then method. */
export function listOperations(document: unknown): ApiOperation[] {
  const parsed = DocumentSchema.safeParse(document);
  if (!parsed.success) return [];
  const operations: ApiOperation[] = [];
  for (const [path, item] of Object.entries(parsed.data.paths)) {
    for (const method of OPERATION_METHODS) {
      if (!(method in item)) continue;
      const operation = OperationSchema.safeParse(item[method]);
      if (!operation.success) continue;
      operations.push({
        method: method.toUpperCase(),
        path,
        ...operation.data,
      });
    }
  }
  const order = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  return operations.sort(
    (a, b) => order(a.path, b.path) || order(a.method, b.method),
  );
}

/** Operations whose `METHOD /path summary` contains the filter, case-insensitive. */
export function filterOperations(
  operations: ApiOperation[],
  filter?: string,
): ApiOperation[] {
  if (!filter) return operations;
  const needle = filter.toLowerCase();
  return operations.filter((operation) =>
    `${operation.method} ${operation.path} ${operation.summary ?? ''}`
      .toLowerCase()
      .includes(needle),
  );
}

/** The components the operations reference (`#/components/<kind>/<name>`), followed transitively. */
export function referencedComponents(
  document: unknown,
  operations: ApiOperation[],
): Record<string, Record<string, unknown>> {
  const parsed = DocumentSchema.safeParse(document);
  const available = (parsed.success && parsed.data.components) || {};
  const found: Record<string, Record<string, unknown>> = {};
  const visited = new Set<string>();
  const queue: unknown[] = [...operations];
  for (let index = 0; index < queue.length; index += 1) {
    const value = queue[index];
    if (Array.isArray(value)) {
      queue.push(...value);
      continue;
    }
    if (!isRecord(value)) continue;
    for (const [key, child] of Object.entries(value)) {
      if (key !== '$ref' || typeof child !== 'string') {
        queue.push(child);
        continue;
      }
      const match = COMPONENT_REF.exec(child);
      if (!match || visited.has(child)) continue;
      visited.add(child);
      const [, kind, name] = match;
      const component = available[kind]?.[name];
      if (component === undefined) continue;
      found[kind] = { ...found[kind], [name]: component };
      queue.push(component);
    }
  }
  return found;
}

function formatOperation(operation: ApiOperation): string {
  const summary = operation.summary ? `  ${operation.summary}` : '';
  return `${operation.method.padEnd(6)} ${operation.path}${summary}`;
}

/**
 * List the operations of the app's live public API document. Exit 0 (also
 * when nothing matches), 1 for a non-2xx answer or a body that is not an
 * OpenAPI document, 4 when the app cannot be reached.
 */
export async function runApiList(
  options: ApiListOptions,
  io: Pick<ApiCommandIO, 'stdout' | 'stderr'> = defaultIO(),
): Promise<ApiExit> {
  const appUrl = resolveAppUrl();
  let text: string;
  try {
    const response = await appFetch(APP_PATHS.openapi, { baseUrl: appUrl });
    if (!response.ok) {
      line(
        io.stderr,
        `HTTP ${response.status} ${response.statusText}`.trimEnd() +
          ` for ${APP_PATHS.openapi}`,
      );
      return EXIT.http;
    }
    text = await response.text();
  } catch (error) {
    line(
      io.stderr,
      `could not reach ${originOf(appUrl)}: ${fetchFailureReason(error)}`,
    );
    return EXIT.unreachable;
  }

  const document = parseJson(text);
  if (!DocumentSchema.safeParse(document).success) {
    line(io.stderr, 'the answer is not an OpenAPI document (no paths)');
    return EXIT.http;
  }

  const operations = filterOperations(listOperations(document), options.filter);
  if (operations.length === 0) {
    line(io.stderr, `no operation matches "${options.filter ?? ''}"`);
    return EXIT.ok;
  }

  io.stdout.write(
    options.json
      ? JSON.stringify(
          {
            operations,
            components: referencedComponents(document, operations),
          },
          null,
          2,
        ) + '\n'
      : operations
          .map((operation) => formatOperation(operation) + '\n')
          .join(''),
  );
  return EXIT.ok;
}

const OptionsSchema = z.object({
  data: z.string().optional(),
  header: z.array(z.string()).default([]),
  project: z.string().optional(),
  yes: z.boolean().optional(),
});

const collect = (value: string, previous: string[]): string[] => [
  ...previous,
  value,
];

export function registerApiCommand(
  program: Command,
  exit: (code: number) => never = (code) => process.exit(code),
): void {
  const usageExit = (error: CommanderError): never =>
    exit(error.exitCode === 0 ? 0 : EXIT.usage);
  const api = program
    .command('api')
    .description(
      'Send an authenticated request to the walkerOS app API and print the answer as it arrives',
    )
    .argument('<method>', 'GET, POST, PUT, PATCH or DELETE')
    .argument(
      '<path>',
      'the API path with its query, for example /api/projects/{projectId}/flows',
    )
    .option(
      '-d, --data <body>',
      'request body: JSON, @file.json, or - for stdin',
    )
    .option(
      '-H, --header <header>',
      "extra header 'Name: value' (repeatable)",
      collect,
      [],
    )
    .option(
      '-p, --project <id>',
      'fills {projectId} (default: WALKEROS_PROJECT_ID)',
    )
    .option('-y, --yes', 'confirm a DELETE')
    .exitOverride(usageExit)
    .action(async (method: string, path: string, raw: unknown) => {
      const options = OptionsSchema.parse(raw);
      process.exitCode = await runApi({ method, path, ...options });
    });

  api
    .command('ls [filter]')
    .description(
      'List the public API operations from the live OpenAPI document of the app',
    )
    .option('--json', 'print each operation with its parameters and schemas')
    .exitOverride(usageExit)
    .action(async (filter: string | undefined, raw: unknown) => {
      const { json } = z.object({ json: z.boolean().optional() }).parse(raw);
      process.exitCode = await runApiList({ filter, json });
    });
}
