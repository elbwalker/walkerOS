import { validate, loadJsonConfig } from '@walkeros/cli';
import type { ValidateResult } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { ValidateOutputShape } from '../schemas/output.js';

import type { ToolSpec } from '../tool-spec.js';

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

    // Post-validation pass: detect deprecated `@walkeros/store-memory`
    // references in flow configs. MCP-layer concern — keeps core
    // validation package-agnostic.
    let augmented = result;
    if (type === 'flow' && typeof validateInput === 'string') {
      try {
        const config = await loadJsonConfig<unknown>(validateInput);
        const deprecatedErrors = detectDeprecatedStorePackages(config);
        if (deprecatedErrors.length > 0) {
          augmented = {
            ...result,
            valid: false,
            errors: [...result.errors, ...deprecatedErrors],
          };
        }
      } catch {
        // Load failed (invalid JSON, missing file, etc.). The CLI validate
        // call already surfaces that; skip the deprecated-package check.
      }
    }

    const hints = augmented.valid
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
    // Validation `message` and `path` are tool-generated, not echoed user
    // input — both stay literal, never wrapped in <user_data>.
    return mcpResult(augmented, hints);
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
