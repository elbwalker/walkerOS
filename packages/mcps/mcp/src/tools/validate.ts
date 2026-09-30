import { validate } from '@walkeros/cli';
import type { ValidateResult } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { ValidateOutputShape } from '../schemas/output.js';

import type { ToolSpec } from '../tool-spec.js';
import {
  HINT_OUT_OF_PROCESS,
  refusalHint,
  RuntimeRefusal,
  type FlowRuntime,
} from '../runtime/types.js';
import { isCloudId } from '../cloud-flow.js';

type ValidateType = 'contract' | 'event' | 'flow' | 'mapping';

/**
 * Resolve the validate input through the runtime. For `type: 'event'`, a bare
 * string the runtime cannot resolve is the event-name shorthand and becomes
 * `{ name }`; the shorthand reads nothing, so it holds under every runtime.
 * Every other failure surfaces: a `RuntimeRefusal` (a policy decision), a
 * failed saved-id lookup, and any load error for a flow, mapping or contract.
 */
async function loadValidateInput(
  runtime: FlowRuntime,
  input: string,
  type: ValidateType,
): Promise<unknown> {
  if (!input || input.trim() === '') throw new Error(`${type} is required`);
  const trimmed = input.trim();
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  try {
    return await runtime.load(input);
  } catch (error) {
    if (error instanceof RuntimeRefusal || isCloudId(trimmed)) throw error;
    if (looksLikeJson) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse ${type}. ${message}`);
    }
    if (type === 'event') return { name: trimmed };
    throw error;
  }
}

const TITLE = 'Validate Flow';
const DESCRIPTION =
  'Validate walkerOS events, flow configurations, mapping rules, or data contracts. ' +
  'Accepts JSON strings, file paths, or URLs as input; on the hosted server only inline JSON or a saved flow id (flow_ or cfg_), no file paths or URLs. ' +
  "With only type and input, a flow runs every check on every flow and step, including each package's settings schema (fetched from the package CDN; offline: true skips that and says so). " +
  'flow and path narrow the run; strict turns warnings and skips into failures: valid is false. ' +
  'Returns valid, errors and warnings with stable codes, and details.scope (what was checked), details.skipped (checks that could not run) and details.deferred (values known only at runtime).';

const inputSchema = schemas.ValidateInputShape;

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function createFlowValidateToolSpec(runtime: FlowRuntime): ToolSpec {
  return {
    name: 'flow_validate',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowValidateHandlerBody(runtime, input),
  };
}

async function flowValidateHandlerBody(runtime: FlowRuntime, input: unknown) {
  const parsed = schemas.ValidateInputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return mcpError(parsed.error, 'Check the flow_validate input fields');
  }
  const {
    type,
    input: validateInput,
    flow,
    path,
    strict,
    offline,
  } = parsed.data;
  try {
    // Resolve the input through the runtime and validate the parsed document.
    // Handed a string, the cli `validate` would read files and URLs itself;
    // handing it the parsed object keeps every read behind the runtime.
    const resolved = await loadValidateInput(runtime, validateInput, type);
    const configDir = runtime.baseDir?.(validateInput);
    const result: ValidateResult = await validate(type, resolved, {
      flow,
      path,
      strict,
      offline,
      ...(configDir ? { configDir } : {}),
    });

    const skipped = result.details.skipped ?? [];
    const next = runtime.simulate
      ? ['Use flow_simulate to test event flow', 'Use flow_bundle to build']
      : [HINT_OUT_OF_PROCESS];
    const hints =
      !result.valid && result.errors.length === 0
        ? {
            next: [
              `strict: ${result.warnings.length} warning(s) and ${skipped.length} skipped check(s) count as failures; resolve them, or run without strict`,
            ],
          }
        : !result.valid
          ? {
              next: [
                'Fix errors above, then run flow_validate again',
                'Read walkeros://reference/flow-schema for correct structure',
              ],
            }
          : skipped.length > 0
            ? {
                next: [
                  `Valid in checked scope; ${skipped.length} check(s) skipped, see details.skipped`,
                  ...next,
                ],
              }
            : { next };
    // Validation `message` and `path` are tool-generated, not echoed user
    // input — both stay literal, never wrapped in <user_data>.
    return mcpResult(result, hints);
  } catch (error) {
    return mcpError(
      error,
      refusalHint(
        error,
        'Check the input parameter — expected a JSON string, file path, or URL',
      ),
    );
  }
}

export function registerFlowValidateTool(
  server: McpServer,
  runtime: FlowRuntime,
) {
  const spec = createFlowValidateToolSpec(runtime);
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
