import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  WebStandardStreamableHTTPServerTransport,
  type WebStandardStreamableHTTPServerTransportOptions,
} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

export interface CreateStreamableHttpHandlerOptions extends WebStandardStreamableHTTPServerTransportOptions {
  /**
   * Called after a session is initialized. Wraps onsessioninitialized.
   */
  onSessionInitialized?: (sessionId: string) => void | Promise<void>;
}

/**
 * Returns a Fetch-style handler: `(Request) => Promise<Response>`.
 *
 * Single call creates a dedicated transport instance and connects it to the
 * given `McpServer`. The handler holds that transport for its entire
 * lifetime, call `createStreamableHttpHandler` once per app lifecycle, not
 * per request. For multi-session hosting (different users, persistent
 * sessions), instantiate one handler per session keyed by `Mcp-Session-Id`
 * at the Route Handler layer; this factory is the session-agnostic
 * building block.
 */
export function createStreamableHttpHandler(
  server: McpServer,
  opts: CreateStreamableHttpHandlerOptions = {},
): (request: Request) => Promise<Response> {
  const { onSessionInitialized, ...transportOpts } = opts;
  const userInit = transportOpts.onsessioninitialized;
  const transport = new WebStandardStreamableHTTPServerTransport({
    ...transportOpts,
    onsessioninitialized: async (sessionId) => {
      await userInit?.(sessionId);
      await onSessionInitialized?.(sessionId);
    },
  });

  const connectPromise = server.connect(transport);

  return async (request: Request): Promise<Response> => {
    await connectPromise;
    return transport.handleRequest(request);
  };
}
