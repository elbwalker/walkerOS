import { z } from 'zod';
import { loadJsonConfig } from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import type { Flow } from '@walkeros/core';
import { ExamplesListOutputShape } from '../schemas/output.js';

export function registerFlowExamplesTool(server: McpServer) {
  server.registerTool(
    'flow_examples',
    {
      title: 'Flow Examples',
      description:
        'List all step examples in a walkerOS flow configuration. ' +
        'Shows example names, step locations, and in/out shapes. ' +
        'Use this to discover available test fixtures and simulation data.',
      inputSchema: {
        configPath: z
          .string()
          .min(1)
          .describe(
            'Path to flow configuration file, URL, or inline JSON string',
          ),
        flow: z
          .string()
          .optional()
          .describe('Flow name for multi-flow configs'),
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
      },
      outputSchema: ExamplesListOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ configPath, flow, step, full, includeHidden }) => {
      try {
        const rawConfig = await loadJsonConfig<Flow.Config>(configPath);

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
            'No examples found. Add examples to step definitions in your flow config for testing.',
          ];
        }
        return mcpResult(result, hints);
      } catch (error) {
        return mcpError(error, 'Check configPath — expected a flow.json file');
      }
    },
  );
}
