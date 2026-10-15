import type { ZodRawShape } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

/**
 * A full tool specification: metadata plus executable handler.
 *
 * Produced by each `create<Name>ToolSpec(...)` factory. The local server
 * registers every spec through one path; a host without an `McpServer`
 * drives the handlers directly.
 */
export interface ToolSpec {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  /** Wire-only output shape; absent where a tool answers in several shapes. */
  outputSchema?: ZodRawShape;
  annotations: ToolAnnotations;
  handler: (input: unknown) => Promise<CallToolResult>;
}
