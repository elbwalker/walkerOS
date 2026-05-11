import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ToolClient } from './tool-client.js';
import { registerFlowValidateTool } from './tools/validate.js';
import { registerFlowBundleTool } from './tools/bundle.js';
import { registerFlowSimulateTool } from './tools/simulate.js';
import { registerFlowPushTool } from './tools/push.js';
import { registerFlowExamplesTool } from './tools/examples.js';
import {
  registerPackageSearchTool,
  registerGetPackageSchemaTool,
} from './tools/package.js';
import { registerFlowLoadTool } from './tools/flow-load.js';
import { registerFeedbackTool } from './tools/feedback.js';
import { registerAuthTool } from './tools/auth.js';
import { registerProjectManageTool } from './tools/project-manage.js';
import { registerFlowManageTool } from './tools/flow-manage.js';
import { registerDeployTool } from './tools/deploy-manage.js';
import { registerPackageSchemaResources } from './resources/package-schemas.js';
import { registerReferenceResources } from './resources/references.js';
import { registerAddStepPrompt } from './prompts/add-step.js';
import { registerSetupMappingPrompt } from './prompts/setup-mapping.js';
import { registerManageContractPrompt } from './prompts/manage-contract.js';
import { SERVER_INSTRUCTIONS } from './instructions.js';
import { createMcpEmitter, type McpEmitter } from './telemetry.js';

export interface Logger {
  debug?(message: string, meta?: Record<string, unknown>): void;
  info?(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  error?(message: string, meta?: Record<string, unknown>): void;
}

export interface CreateServerOptions {
  client: ToolClient;
  logger?: Logger;
  version?: string;
  catalogBaseUrl?: string;
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

/**
 * Minimal shape of a `_registeredTools` entry we rely on for handler
 * wrapping. Typed locally to avoid leaking SDK internals while keeping
 * strict typing on the handler signature.
 */
type WrappableRegisteredTool = {
  handler: (...args: unknown[]) => unknown;
};

type RegisteredToolsRecord = Record<string, WrappableRegisteredTool>;

/**
 * Wrap every already-registered tool handler with telemetry. The wrapper
 * emits `cmd invoke` with outcome + timing, swallowing any telemetry error
 * so it never surfaces to the tool caller. We look up the emitter lazily at
 * call time so wrapping can happen before the emitter is created.
 */
function wrapRegisteredToolsWithTelemetry(server: McpServer): void {
  const internal = server as unknown as {
    _registeredTools: RegisteredToolsRecord;
  };
  const tools = internal._registeredTools;
  if (!tools) return;
  for (const [toolName, tool] of Object.entries(tools)) {
    const original = tool.handler;
    tool.handler = async (...args: unknown[]): Promise<unknown> => {
      const start = Date.now();
      try {
        const result = await original(...args);
        const emitter = currentEmitter;
        if (emitter) {
          emitter
            .emitInvoke(toolName, 'success', Date.now() - start)
            .catch(() => {});
        }
        return result;
      } catch (err) {
        const emitter = currentEmitter;
        if (emitter) {
          emitter
            .emitInvoke(toolName, 'error', Date.now() - start)
            .catch(() => {});
        }
        throw err;
      }
    };
  }
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

  registerAuthTool(server, opts.client);
  registerProjectManageTool(server, opts.client);
  registerFlowManageTool(server, opts.client);
  registerDeployTool(server, opts.client);
  registerFeedbackTool(server, opts.client);

  registerFlowValidateTool(server);
  registerFlowBundleTool(server);
  registerFlowSimulateTool(server);
  registerFlowPushTool(server);
  registerFlowExamplesTool(server);
  registerFlowLoadTool(server);

  registerPackageSearchTool(server);
  registerGetPackageSchemaTool(server);

  registerPackageSchemaResources(server);
  registerReferenceResources(server);
  registerAddStepPrompt(server);
  registerSetupMappingPrompt(server);
  registerManageContractPrompt(server);

  wrapRegisteredToolsWithTelemetry(server);

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
