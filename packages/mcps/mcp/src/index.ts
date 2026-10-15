declare module '@walkeros/core' {
  interface SourceMap {
    mcp: { type: 'mcp'; platform: 'server'; tool?: string };
  }
}

export {
  createWalkerOSMcpServer,
  type CreateServerOptions,
  type Logger,
} from './server.js';

/**
 * The eight local tools as specs, for a host that drives them without an
 * McpServer. Pass `createLocalRuntime()` on the user's own machine, or a
 * runtime with `load` only where files, URLs and execution are not allowed.
 */
export {
  createToolHandlers,
  type LocalServerToolSpecs,
} from './tool-handlers.js';

export { createLocalRuntime } from './runtime/local.js';

export * from './specs.js';

export type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
