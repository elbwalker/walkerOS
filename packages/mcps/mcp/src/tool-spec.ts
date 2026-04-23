import type { ZodRawShape } from 'zod';
import type { ToolAnnotations } from './tool-definitions.js';

/**
 * A full tool specification: metadata + executable handler.
 *
 * Produced by each `create<Name>ToolSpec(...)` factory and by the aggregate
 * `createToolHandlers(client)`. Consumers without an `McpServer` (e.g., the
 * walkerOS app's chat route wrapping tools as Vercel AI SDK tools) use this
 * directly; the server factory uses it to call `McpServer.registerTool`.
 */
export interface ToolSpec {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  annotations: ToolAnnotations;
  handler: (input: unknown) => Promise<unknown>;
}
