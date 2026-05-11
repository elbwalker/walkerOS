import { z } from 'zod';
import { loadJsonConfig } from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import type { Flow } from '@walkeros/core';
import { ExamplesListOutputShape } from '../schemas/output.js';

import type { ToolSpec } from '../tool-spec.js';

const TITLE = 'Flow Examples';
const DESCRIPTION =
  'List all step examples in a walkerOS flow configuration. ' +
  'Shows example names, step locations, and in/out shapes. ' +
  'Use this to discover available test fixtures and simulation data.';

const inputSchema = {
  configPath: z
    .string()
    .min(1)
    .describe('Path to flow configuration file, URL, or inline JSON string'),
  flow: z.string().optional().describe('Flow name for multi-flow configs'),
  step: z
    .string()
    .optional()
    .describe('Filter to a specific step (e.g., "destination.gtag")'),
  full: z
    .boolean()
    .optional()
    .describe(
      'Return full in/out/mapping data for each example (default: false, returns metadata only)',
    ),
  includeHidden: z
    .boolean()
    .optional()
    .describe(
      'Include examples marked public: false (default: false). Set true for test/debug discovery.',
    ),
};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function createFlowExamplesToolSpec(): ToolSpec {
  return {
    name: 'flow_examples',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    annotations,
    handler: (input) => flowExamplesHandlerBody(input),
  };
}

async function flowExamplesHandlerBody(input: unknown) {
  const { configPath, flow, step, full, includeHidden } = (input ?? {}) as {
    configPath: string;
    flow?: string;
    step?: string;
    full?: boolean;
    includeHidden?: boolean;
  };
  try {
    const rawConfig = await loadJsonConfig<Flow.Json>(configPath);

    // Resolve flow name
    const flowNames = Object.keys(rawConfig.flows || {});
    const flowName =
      flow || (flowNames.length === 1 ? flowNames[0] : undefined);

    if (!flowName) {
      throw new Error(
        `Multiple flows found. Specify flow parameter. Available: ${flowNames.join(', ')}`,
      );
    }

    const flowSettings = rawConfig.flows[flowName];
    if (!flowSettings) {
      throw new Error(`Flow "${flowName}" not found`);
    }

    // Collect all examples
    const examples: Array<{
      step: string;
      stepType: string;
      stepName: string;
      exampleName: string;
      title?: string;
      description?: string;
      public?: boolean;
      hasIn: boolean;
      hasOut: boolean;
      hasMapping: boolean;
      hasTrigger: boolean;
      in?: unknown;
      out?: unknown;
      mapping?: unknown;
      trigger?: unknown;
    }> = [];

    const stepTypes = [
      { key: 'sources' as const, type: 'source' },
      { key: 'transformers' as const, type: 'transformer' },
      { key: 'destinations' as const, type: 'destination' },
    ];

    for (const { key, type } of stepTypes) {
      const refs = flowSettings[key] || {};
      for (const [name, ref] of Object.entries(refs)) {
        if (!ref.examples) continue;

        // Apply step filter
        if (step && `${type}.${name}` !== step) continue;

        for (const [exName, ex] of Object.entries(
          ref.examples as Flow.StepExamples,
        )) {
          if (!includeHidden && ex.public === false) continue;
          examples.push({
            step: `${type}.${name}`,
            stepType: type,
            stepName: name,
            exampleName: exName,
            title: ex.title,
            description: ex.description,
            public: ex.public,
            hasIn: ex.in !== undefined,
            hasOut: ex.out !== undefined,
            hasMapping: ex.mapping !== undefined,
            hasTrigger: ex.trigger !== undefined,
            ...(full
              ? {
                  in: ex.in,
                  out: ex.out,
                  mapping: ex.mapping,
                  trigger: ex.trigger,
                }
              : {}),
          });
        }
      }
    }

    const result = {
      flow: flowName,
      count: examples.length,
      examples,
    };

    const hints: { next: string[]; warnings?: string[] } = {
      next: ['Use flow_simulate with step and event to simulate'],
    };
    if (examples.length === 0) {
      hints.warnings = [
        'No examples found. Add examples to step entries in your flow config for testing.',
      ];
    }
    return mcpResult(result, hints);
  } catch (error) {
    return mcpError(error, 'Check configPath — expected a flow.json file');
  }
}

export function registerFlowExamplesTool(server: McpServer) {
  const spec = createFlowExamplesToolSpec();
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      // outputSchema is wire-only; not part of ToolSpec
      outputSchema: ExamplesListOutputShape,
      annotations: spec.annotations,
    },
    // SDK infers handler type from inputSchema shape; ToolSpec.handler is the
    // type-erased (input: unknown) => Promise<unknown> form by design.
    spec.handler as Parameters<typeof server.registerTool>[2],
  );
}
