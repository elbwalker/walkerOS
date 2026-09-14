import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setClientContext } from '@walkeros/cli';

import { createWalkerOSMcpServer, getMcpEmitterSingleton } from './server.js';
import { HttpToolClient } from './http-tool-client.js';
import { createMcpEmitter } from './telemetry.js';

declare const __VERSION__: string;

setClientContext({ type: 'mcp', version: __VERSION__ });

// Hook process-level error channels so we can emit `error throw` before the
// process tears down. Both handlers look up the emitter lazily: if the MCP
// handshake never completed, no emitter exists and we silently skip.
// We don't call process.exit — stdio transport already propagates failures
// up to the parent client via the JSON-RPC channel.
process.on('uncaughtException', (err) => {
  const emitter = getMcpEmitterSingleton();
  if (emitter) {
    emitter.emitError('uncaught').catch(() => {});
  }
  console.error('Uncaught exception in Flow MCP server:', err);
});

process.on('unhandledRejection', (reason) => {
  const emitter = getMcpEmitterSingleton();
  if (emitter) {
    emitter.emitError('unhandledRejection').catch(() => {});
  }
  console.error('Unhandled rejection in Flow MCP server:', reason);
});

async function main() {
  const server = createWalkerOSMcpServer({
    client: new HttpToolClient(),
    version: __VERSION__,
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS Flow MCP server running on stdio');
}

main().catch(async (error) => {
  // Startup failure — no client handshake happened, so there's no emitter in
  // the module singleton. Build a one-shot emitter with an unknown client so
  // the error is still visible to telemetry.
  try {
    const emitter = await createMcpEmitter({
      clientInfo: undefined,
      packageVersion: __VERSION__,
    });
    await emitter.emitError('startup');
  } catch {
    // swallow — telemetry must never mask the original startup error
  }
  console.error('Failed to start Flow MCP server:', error);
  process.exit(1);
});
