import { validate } from '@walkeros/cli';
import type { ValidateResult } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { ValidateOutputShape } from '../schemas/output.js';

export function registerFlowValidateTool(server: McpServer) {
  server.registerTool(
    'flow_validate',
    {
      title: 'Validate Flow',
      description:
        'Validate walkerOS events, flow configurations, mapping rules, or data contracts. ' +
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
    async ({ type, input, flow, path }) => {
      try {
        const result: ValidateResult = await validate(type, input, {
          flow,
          path,
        });
        const hints = result.valid
          ? {
              next: [
                'Use flow_simulate to test event flow',
                'Use flow_bundle to build',
              ],
            }
          : {
              next: [
                'Fix errors above, then run flow_validate again',
                'Read walkeros://reference/flow-schema for correct structure',
              ],
            };
        return mcpResult(result, hints);
      } catch (error) {
        return mcpError(
          error,
          'Check the input parameter — expected a JSON string, file path, or URL',
        );
      }
    },
  );
}
