import { z } from 'zod';
import { mcpResult, mcpError } from '@walkeros/core';
import { redactNestedStrings, keepStructural } from '../user-data.js';

import type { ToolSpec } from '../tool-spec.js';
import { parseToolInput } from './parse-input.js';
import { RuntimeRefusal, type FlowRuntime } from '../runtime/types.js';

const WEB_SKELETON = {
  version: 4,
  flows: {
    default: {
      config: { platform: 'web', bundle: { packages: {} } },
      sources: {},
      destinations: {},
    },
  },
};

const SERVER_SKELETON = {
  version: 4,
  flows: {
    default: {
      config: { platform: 'server', bundle: { packages: {} } },
      sources: {},
      destinations: {},
    },
  },
};

const TITLE = 'Load or Create Flow';
const DESCRIPTION =
  'Load a flow configuration (inline JSON, or a reference this server can read; on your own machine a file path or an http(s) URL), ' +
  'or create a new empty flow by specifying a platform (web or server). ' +
  'Use the add-step prompt to add sources, destinations, transformers, or stores to the flow.';

const inputSchema = {
  source: z
    .string()
    .optional()
    .describe(
      'Flow source: inline JSON, or a reference this server can read ' +
        '(locally a file path such as ./flow.json or an http(s) URL). Omit to create a new flow.',
    ),
  platform: z
    .enum(['web', 'server'])
    .optional()
    .describe(
      'Platform for new flows. Required when source is omitted. ' +
        'web = browser tracking, server = Node.js HTTP.',
    ),
};

const outputSchema = {
  version: z.number().describe('Flow config version'),
  flows: z.record(z.string(), z.unknown()).describe('Flow entries'),
};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function createFlowLoadToolSpec(runtime: FlowRuntime): ToolSpec {
  return {
    name: 'flow_load',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    outputSchema,
    annotations,
    handler: (input) => flowLoadHandlerBody(runtime, input),
  };
}

async function flowLoadHandlerBody(runtime: FlowRuntime, input: unknown) {
  const parsed = parseToolInput(inputSchema, input);
  if (!parsed.ok) return parsed.error;
  const { source, platform } = parsed.data;

  try {
    if (source) {
      // Every file or URL read goes through the runtime, which decides what
      // this process may load.
      const config = await runtime.load(source);
      return mcpResult(redactNestedStrings(config, { skip: keepStructural }), {
        next: ['Use flow_validate to check', 'Use add-step prompt to modify'],
      });
    }

    if (!platform) {
      return mcpError(
        new Error(
          'Provide source (file path or URL) to load existing flow, ' +
            'or platform (web/server) to create a new one.',
        ),
      );
    }

    const skeleton = platform === 'web' ? WEB_SKELETON : SERVER_SKELETON;
    return mcpResult(skeleton, {
      next: [
        'Read walkeros://reference/flow-schema for config structure',
        'Use add-step prompt to add sources and destinations',
      ],
    });
  } catch (error) {
    if (error instanceof RuntimeRefusal) return mcpError(error, error.hint);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('not found') || msg.includes('ENOENT'))
      return mcpError(error, 'Check configPath: expected a flow.json file');
    return mcpError(error);
  }
}
