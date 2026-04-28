import { randomUUID } from 'crypto';
import { telemetry } from '@walkeros/cli';

/**
 * Options for the MCP telemetry emitter wrapper.
 *
 * `clientInfo` mirrors the MCP SDK shape negotiated during initialize.
 * When the client doesn't send one, we record the client name as "unknown"
 * inside the per-event data so downstream analytics can still bucket the
 * event. The walkerOS source identifier is the package itself (`mcp`), not
 * the client.
 */
export interface McpEmitterOptions {
  clientInfo?: { name: string; version: string };
  packageVersion: string;
}

/**
 * MCP-specific event emitter.
 *
 * Wraps `@walkeros/cli`'s `telemetry.createEmitter` with:
 * - `source.type` fixed to `"mcp"`
 * - `source.platform` fixed to `"server"`
 * - per-emission `source.tool` for `cmd invoke` events
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
 * All consent, debug, and endpoint resolution is delegated to the CLI's
 * underlying `telemetry.createEmitter`. This wrapper only provides
 * MCP-specific field mapping and event shorthands.
 */
export async function createMcpEmitter(
  opts: McpEmitterOptions,
): Promise<McpEmitter> {
  const clientName = opts.clientInfo?.name || 'unknown';
  const session = randomUUID();

  const emitter = await telemetry.createEmitter({
    source: {
      type: 'mcp',
      platform: 'server',
    },
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
      await emitter.send(
        'cmd invoke',
        { outcome, client: clientName },
        timingMs,
        { tool },
      );
    },
    async emitError(kind) {
      await emitter.send('error throw', { kind });
    },
  };
}
