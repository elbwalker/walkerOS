import { validate } from '@walkeros/cli';
import type { ValidateResult } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { ValidateOutputShape } from '../schemas/output.js';
import { wrapUserData } from '../user-data.js';

import type { ToolSpec } from '../tool-spec.js';

function wrapIssueMessages(result: ValidateResult): ValidateResult {
  return {
    ...result,
    errors: result.errors.map((e) => ({
      ...e,
      message: wrapUserData(e.message),
    })),
    warnings: result.warnings.map((w) => ({
      ...w,
      message: wrapUserData(w.message),
    })),
  };
}

const TITLE = 'Validate Flow';
const DESCRIPTION =
  'Validate walkerOS events, flow configurations, mapping rules, or data contracts. ' +
  'Accepts JSON strings, file paths, or URLs as input. ' +
  'Returns validation results with errors, warnings, and details.';

const inputSchema = schemas.ValidateInputShape;

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function createFlowValidateToolSpec(): ToolSpec {
  return {
    name: 'flow_validate',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowValidateHandlerBody(input),
  };
}

async function flowValidateHandlerBody(input: unknown) {
  const {
    type,
    input: validateInput,
    flow,
    path,
  } = (input ?? {}) as {
    type: 'contract' | 'event' | 'flow' | 'mapping';
    input: string;
    flow?: string;
    path?: string;
  };
  try {
    const result: ValidateResult = await validate(type, validateInput, {
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
    return mcpResult(wrapIssueMessages(result), hints);
  } catch (error) {
    return mcpError(
      error,
      'Check the input parameter — expected a JSON string, file path, or URL',
    );
  }
}

export function registerFlowValidateTool(server: McpServer) {
  const spec = createFlowValidateToolSpec();
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // outputSchema is wire-only; not part of ToolSpec
      outputSchema: ValidateOutputShape,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
