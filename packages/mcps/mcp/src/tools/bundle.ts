import { schemas } from '@walkeros/cli/dev';
import { mcpResult, mcpError } from '@walkeros/core';
import { BundleOutputShape } from '../schemas/output.js';

import type { ToolSpec } from '../tool-spec.js';
import { parseToolInput } from './parse-input.js';
import {
  refusalHint,
  unavailableOperation,
  type FlowRuntime,
} from '../runtime/types.js';

const TITLE = 'Bundle Flow';
const DESCRIPTION =
  'Bundle a walkerOS flow configuration into deployable JavaScript. ' +
  'Resolves all destinations, sources, and transformers, then outputs ' +
  'a tree-shaken production bundle. Returns bundle statistics.';

const inputSchema = {
  ...schemas.BundleInputShape,
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createFlowBundleToolSpec(runtime: FlowRuntime): ToolSpec {
  return {
    name: 'flow_bundle',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    outputSchema: BundleOutputShape,
    annotations,
    handler: (input) => flowBundleHandlerBody(runtime, input),
  };
}

async function flowBundleHandlerBody(runtime: FlowRuntime, input: unknown) {
  const parsed = parseToolInput(inputSchema, input);
  if (!parsed.ok) return parsed.error;
  const { configPath, flow, stats, output } = parsed.data;
  // Bundling compiles the config and resolves every package it names. A
  // runtime that must not do that in its process provides no `bundle`.
  if (!runtime.bundle) {
    const refusal = unavailableOperation('bundle');
    return mcpError(refusal, refusal.hint);
  }
  try {
    const result = await runtime.bundle(configPath, {
      flowName: flow,
      stats: stats ?? true,
      output,
    });

    if (!result) {
      return mcpResult(
        { success: false, message: 'Bundle produced no output' },
        {
          warnings: [
            'The build returned no result. The flow may be empty or misconfigured.',
          ],
          next: ['Run flow_validate to check your configuration'],
        },
      );
    }

    return mcpResult(
      { success: true, ...result },
      {
        next: [
          'Use flow_simulate to test',
          'Use runneros or the walkerOS app to run the bundle',
        ],
      },
    );
  } catch (error) {
    return mcpError(
      error,
      refusalHint(error, 'Run flow_validate for detailed error messages'),
    );
  }
}
