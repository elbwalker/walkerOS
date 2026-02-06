import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerValidateTool(server: McpServer) {
  server.registerTool(
    'validate',
    {
      description:
        'Validate walkerOS events, flow configurations, or mapping rules',
      inputSchema: {
        type: z
          .enum(['event', 'flow', 'mapping'])
          .describe('Type of validation to perform'),
        input: z
          .string()
          .min(1)
          .describe('JSON string, file path, or URL to validate'),
        flow: z
          .string()
          .optional()
          .describe('Flow name for multi-flow configs'),
      },
    },
    async ({ type, input, flow }) => {
      try {
        // Dynamic import to handle peer dependency
        const { validate } = await import('@walkeros/cli');

        // Parse input if it looks like JSON
        let parsedInput: unknown = input;
        if (input.startsWith('{') || input.startsWith('[')) {
          try {
            parsedInput = JSON.parse(input);
          } catch {
            // Keep as string (file path or URL)
          }
        }

        const result = await validate(type, parsedInput, { flow });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
