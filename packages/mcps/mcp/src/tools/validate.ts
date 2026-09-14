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

/**
 * Detect deprecated `@walkeros/store-memory` references in a flow.json.
 * Returns one validation error per offending store.
 *
 * MCP-layer concern: `@walkeros/store-memory` was removed and replaced by
 * the built-in cache (`Flow.Store.cache`). Surface a clear migration error
 * so users know what to do.
 */
const DEPRECATED_STORE_PACKAGE = '@walkeros/store-memory';

function detectDeprecatedStorePackages(
  config: unknown,
): ValidateResult['errors'] {
  const errors: ValidateResult['errors'] = [];
  if (!config || typeof config !== 'object') return errors;
  const flows = (config as { flows?: unknown }).flows;
  if (!flows || typeof flows !== 'object') return errors;
  for (const [flowName, flowEntry] of Object.entries(
    flows as Record<string, unknown>,
  )) {
    if (!flowEntry || typeof flowEntry !== 'object') continue;
    const stores = (flowEntry as { stores?: unknown }).stores;
    if (!stores || typeof stores !== 'object') continue;
    for (const [storeId, storeEntry] of Object.entries(
      stores as Record<string, unknown>,
    )) {
      if (!storeEntry || typeof storeEntry !== 'object') continue;
      const pkg = (storeEntry as { package?: unknown }).package;
      if (pkg === DEPRECATED_STORE_PACKAGE) {
        errors.push({
          path: `flows.${flowName}.stores.${storeId}`,
          message:
            `Store "${storeId}" uses ${DEPRECATED_STORE_PACKAGE}, which has been removed. ` +
            'Use the built-in cache by omitting cache.store, or remove the store ' +
            'declaration if it was only used as a cache target.',
          code: 'DEPRECATED_PACKAGE',
        });
      }
    }
  }
  return errors;
}

const TITLE = 'Validate Flow';
const DESCRIPTION =
  'Validate walkerOS events, flow configurations, mapping rules, or data contracts. ' +
  'Accepts JSON strings, file paths, or URLs as input; on the hosted server only inline JSON or a saved flow id (flow_ or cfg_), no file paths or URLs. ' +
  'Returns validation results with errors, warnings, and details.';

const inputSchema = schemas.ValidateInputShape;

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
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
  const {
    type,
    input: validateInput,
    flow,
    path,
  } = (input ?? {}) as {
    type: ValidateType;
    input: string;
    flow?: string;
    path?: string;
  };
  try {
    // Resolve the input through the runtime and validate the parsed document.
    // Handed a string, the cli `validate` would read files and URLs itself;
    // handing it the parsed object keeps every read behind the runtime.
    const resolved = await loadValidateInput(runtime, validateInput, type);
    const result: ValidateResult = await validate(type, resolved, {
      flow,
      path,
    });

    // Post-validation pass: detect deprecated `@walkeros/store-memory`
    // references in flow configs. MCP-layer concern — keeps core
    // validation package-agnostic.
    let augmented = result;
    if (type === 'flow') {
      const deprecatedErrors = detectDeprecatedStorePackages(resolved);
      if (deprecatedErrors.length > 0) {
        augmented = {
          ...result,
          valid: false,
          errors: [...result.errors, ...deprecatedErrors],
        };
      }
    }

    const hints = augmented.valid
      ? {
          next: runtime.simulate
            ? [
                'Use flow_simulate to test event flow',
                'Use flow_bundle to build',
              ]
            : [HINT_OUT_OF_PROCESS],
        }
      : {
          next: [
            'Fix errors above, then run flow_validate again',
            'Read walkeros://reference/flow-schema for correct structure',
          ],
        };
    // Validation `message` and `path` are tool-generated, not echoed user
    // input — both stay literal, never wrapped in <user_data>.
    return mcpResult(augmented, hints);
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
