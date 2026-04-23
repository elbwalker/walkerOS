import { randomUUID } from 'crypto';
import { telemetry } from '@walkeros/cli';

/**
 * Options for the MCP telemetry emitter wrapper.
 *
 * `clientInfo` mirrors the MCP SDK shape negotiated during initialize.
 * When the client doesn't send one, we record `source.type` as "unknown"
 * so downstream analytics can still bucket the event.
 */
export interface McpEmitterOptions {
  clientInfo?: { name: string; version: string };
  packageVersion: string;
}

/**
 * MCP-specific event emitter.
 *
 * Wraps `@walkeros/cli`'s `telemetry.createEmitter` with:
 * - `source.id` fixed to `"mcp"`
 * - `source.type` mapped from `clientInfo.name` (MCP client identity)
 * - a fresh session UUID per MCP server instance
 *
 * Surfaces the narrow set of events the MCP server needs to emit.
 */
export interface McpEmitter {
  emitStart(): Promise<void>;
  emitInvoke(
    tool: string,
    outcome: 'success' | 'error',
    timingMs: number,
  ): Promise<void>;
  emitError(kind: 'uncaught' | 'unhandledRejection' | 'startup'): Promise<void>;
}

/**
 * Build an MCP telemetry emitter.
 *
 * All opt-out, debug, and endpoint resolution is delegated to the CLI's
 * underlying `telemetry.createEmitter` — this wrapper only provides MCP-specific
 * field mapping and event shorthands.
 */
export async function createMcpEmitter(
  opts: McpEmitterOptions,
): Promise<McpEmitter> {
  const clientName = opts.clientInfo?.name || 'unknown';
  const session = randomUUID();

  const emitter = await telemetry.createEmitter({
    sourceId: 'mcp',
    sourceType: clientName,
    packageVersion: opts.packageVersion,
    session,
  });

  return {
    async emitStart() {
      const ci = telemetry.getCiInfo();
      await emitter.send('mcp start', {
        ...ci,
        client: clientName,
      });
    },
    async emitInvoke(tool, outcome, timingMs) {
      await emitter.send('cmd invoke', { tool, outcome }, timingMs);
    },
    async emitError(kind) {
      await emitter.send('error throw', { kind });
    },
  };
}
