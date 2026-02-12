import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ValidateOutputShape } from '../schemas/output.js';

export function registerValidateTool(server: McpServer) {
  server.registerTool(
    'validate',
    {
      title: 'Validate',
      description:
        'Validate walkerOS events, flow configurations, or mapping rules. ' +
        'Accepts JSON strings, file paths, or URLs as input. ' +
        'Returns validation results with errors, warnings, and details.',
      inputSchema: schemas.ValidateInputShape,
      outputSchema: ValidateOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
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
          structuredContent: result as unknown as Record<string, unknown>,
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
