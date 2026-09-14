import { z } from 'zod';
import type { PushResult } from '@walkeros/cli';
import { schemas } from '@walkeros/cli/dev';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { PushOutputShape } from '../schemas/output.js';

import type { ToolSpec } from '../tool-spec.js';
import {
  refusalHint,
  unavailableOperation,
  type FlowRuntime,
} from '../runtime/types.js';

const TITLE = 'Push Events';
const DESCRIPTION =
  'Push a real event through a walkerOS flow to actual destinations. ' +
  'Makes real API calls to real endpoints. ' +
  'Best suited for server-side flows — web flows should use flow_simulate for testing.';

const inputSchema = {
  configPath: schemas.PushInputShape.configPath,
  event: z
    .record(z.string(), z.unknown())
    .describe(
      'Event object, e.g. { name: "page view", data: { title: "Home" } }',
    ),
  flow: schemas.PushInputShape.flow,
  platform: schemas.PushInputShape.platform,
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createFlowPushToolSpec(runtime: FlowRuntime): ToolSpec {
  return {
    name: 'flow_push',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowPushHandlerBody(runtime, input),
  };
}

async function flowPushHandlerBody(runtime: FlowRuntime, input: unknown) {
  const { configPath, event, flow, platform } = (input ?? {}) as {
    configPath: string;
    event: Record<string, unknown>;
    flow?: string;
    platform?: 'web' | 'server';
  };
  // Push compiles the config, imports it, and makes real outbound calls. A
  // runtime that must not do that in its process provides no `push`.
  if (!runtime.push) {
    const refusal = unavailableOperation('push');
    return mcpError(refusal, refusal.hint);
  }
  try {
    const result: PushResult = await runtime.push(configPath, event, {
      flow,
      platform,
    });

    if (!result.success) {
      return mcpError(
        new Error(result.error || 'Push failed'),
        'Check destination configuration and connectivity.',
      );
    }

    return mcpResult(result);
  } catch (error) {
    return mcpError(
      error,
      refusalHint(
        error,
        'Check configPath and event format. For web flows, use flow_simulate.',
      ),
    );
  }
}

export function registerFlowPushTool(server: McpServer, runtime: FlowRuntime) {
  const spec = createFlowPushToolSpec(runtime);
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // outputSchema is wire-only; not part of ToolSpec
      outputSchema: PushOutputShape,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
