import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';

import { isObject } from '@walkeros/core';

import { createToolHandlers } from './tool-handlers.js';
import type { ToolSpec } from './tool-spec.js';
import { KNOWLEDGE_RESOURCES, PROMPTS } from './specs.js';
import type { PromptSpec, ResourceSpec } from './knowledge-spec.js';
import { SERVER_INSTRUCTIONS } from './instructions.js';
import { createMcpEmitter, type McpEmitter } from './telemetry.js';
import type { FlowRuntime } from './runtime/types.js';

export interface Logger {
  debug?(message: string, meta?: Record<string, unknown>): void;
  info?(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  error?(message: string, meta?: Record<string, unknown>): void;
}

export interface CreateServerOptions {
  /** Required: the runtime decides what the process may read and run. */
  runtime: FlowRuntime;
  version?: string;
  logger?: Logger;
}

/**
 * Module-scoped singleton emitter, populated once the MCP `initialize`
 * handshake completes and clientInfo is known. The stdio entrypoint reads
 * this to emit process-level `error throw` events from uncaughtException /
 * unhandledRejection hooks, where the Server instance isn't in scope.
 */
let currentEmitter: McpEmitter | undefined;

export function getMcpEmitterSingleton(): McpEmitter | undefined {
  return currentEmitter;
}

/**
 * Internal: reset for tests that want a clean slate between cases.
 * Not exported from the package.
 */
export function __resetMcpEmitterSingletonForTesting(): void {
  currentEmitter = undefined;
}

/** An MCP tool answers a failure as a result flagged `isError`. */
function isToolError(result: unknown): boolean {
  return isObject(result) && result.isError === true;
}

/**
 * Run one tool call and record its outcome: an answer flagged `isError` and a
 * throw are failures. Telemetry never reaches the caller: an emit that fails
 * is dropped, a throw is re-thrown unchanged. Each handler is wrapped when it
 * is registered, never by patching the SDK's registry. The emitter is looked
 * up at call time, so wrapping happens before the emitter exists.
 */
export async function trackInvoke<T>(
  tool: string,
  run: () => Promise<T>,
  emitter: () => McpEmitter | undefined = getMcpEmitterSingleton,
): Promise<T> {
  const start = Date.now();
  const record = (outcome: 'success' | 'error') => {
    emitter()
      ?.emitInvoke(tool, outcome, Date.now() - start)
      .catch(() => {});
  };
  try {
    const result = await run();
    record(isToolError(result) ? 'error' : 'success');
    return result;
  } catch (error) {
    record('error');
    throw error;
  }
}

/** The one registration path: the spec's own metadata and handler. */
function registerToolSpec(server: McpServer, spec: ToolSpec): void {
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      ...(spec.outputSchema ? { outputSchema: spec.outputSchema } : {}),
      annotations: spec.annotations,
    },
    (args) => trackInvoke(spec.name, () => spec.handler(args)),
  );
}

/** A knowledge resource, static or templated, as the spec describes it. */
export function registerResourceSpec(
  server: McpServer,
  spec: ResourceSpec,
): void {
  if (spec.kind === 'static') {
    server.registerResource(
      spec.name,
      spec.uri,
      { description: spec.description, mimeType: spec.mimeType },
      async (uri) => ({
        contents: [{ uri: uri.toString(), ...(await spec.read()) }],
      }),
    );
    return;
  }
  server.registerResource(
    spec.name,
    new ResourceTemplate(spec.uriTemplate, {
      list: async () => ({ resources: await spec.list() }),
    }),
    {
      title: spec.title,
      description: spec.description,
      mimeType: spec.mimeType,
    },
    async (uri, variables) => ({
      contents: [{ uri: uri.toString(), ...(await spec.read(variables)) }],
    }),
  );
}

/** A prompt with its description, arguments and handler. */
export function registerPromptSpec(server: McpServer, spec: PromptSpec): void {
  server.registerPrompt(
    spec.name,
    { description: spec.description, argsSchema: spec.argsSchema },
    (args) => spec.handler(args),
  );
}

export function createWalkerOSMcpServer(opts: CreateServerOptions): McpServer {
  const packageVersion = opts.version ?? '0.0.0';
  const server = new McpServer(
    {
      name: 'walkeros-flow',
      version: packageVersion,
    },
    { instructions: SERVER_INSTRUCTIONS },
  );

  for (const spec of Object.values(createToolHandlers(opts.runtime)))
    registerToolSpec(server, spec);

  for (const spec of KNOWLEDGE_RESOURCES) registerResourceSpec(server, spec);
  for (const spec of PROMPTS) registerPromptSpec(server, spec);

  // MCP SDK fires `oninitialized` after the `initialized` notification, which
  // follows a successful `initialize` request. At that point `getClientVersion`
  // returns the negotiated client identity. We create the emitter here and
  // emit `mcp start`, so consent, debug, and endpoint resolution happen lazily
  // at the moment a real client connects.
  const priorOnInitialized = server.server.oninitialized;
  server.server.oninitialized = () => {
    try {
      priorOnInitialized?.();
    } catch {
      // existing handler must not prevent telemetry setup
    }
    const clientInfo = server.server.getClientVersion();
    void createMcpEmitter({
      clientInfo,
      packageVersion,
    })
      .then(async (emitter) => {
        currentEmitter = emitter;
        await emitter.emitStart();
      })
      .catch(() => {
        // telemetry must never break the server; swallow setup/emit errors.
      });
  };

  return server;
}
