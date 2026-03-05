import { z } from 'zod';
import { loadJsonConfig } from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Flow } from '@walkeros/core';
import { ExamplesListOutputShape } from '../schemas/output.js';

export function registerExamplesListTool(server: McpServer) {
  server.registerTool(
    'examples_list',
    {
      title: 'List Step Examples',
      description:
        'List all step examples in a walkerOS flow configuration. ' +
        'Shows example names, step locations, and in/out shapes. ' +
        'Use this to discover available test fixtures and simulation data.',
      inputSchema: {
        configPath: z
          .string()
          .min(1)
          .describe('Path to flow configuration file'),
        flow: z
          .string()
          .optional()
          .describe('Flow name for multi-flow configs'),
        step: z
          .string()
          .optional()
          .describe('Filter to a specific step (e.g., "destination.gtag")'),
      },
      outputSchema: ExamplesListOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ configPath, flow, step }) => {
      try {
        const rawConfig = await loadJsonConfig<Flow.Setup>(configPath);

        // Resolve flow name
        const flowNames = Object.keys(rawConfig.flows || {});
        const flowName =
          flow || (flowNames.length === 1 ? flowNames[0] : undefined);

        if (!flowName) {
          throw new Error(
            `Multiple flows found. Specify flow parameter. Available: ${flowNames.join(', ')}`,
          );
        }

        const flowConfig = rawConfig.flows[flowName];
        if (!flowConfig) {
          throw new Error(`Flow "${flowName}" not found`);
        }

        // Collect all examples
        const examples: Array<{
          step: string;
          stepType: string;
          stepName: string;
          exampleName: string;
          hasIn: boolean;
          hasOut: boolean;
          hasMapping: boolean;
          in?: unknown;
          out?: unknown;
          mapping?: unknown;
        }> = [];

        const stepTypes = [
          { key: 'sources' as const, type: 'source' },
          { key: 'transformers' as const, type: 'transformer' },
          { key: 'destinations' as const, type: 'destination' },
        ];

        for (const { key, type } of stepTypes) {
          const refs = flowConfig[key] || {};
          for (const [name, ref] of Object.entries(refs)) {
            if (!ref.examples) continue;

            // Apply step filter
            if (step && `${type}.${name}` !== step) continue;

            for (const [exName, ex] of Object.entries(
              ref.examples as Flow.StepExamples,
            )) {
              examples.push({
                step: `${type}.${name}`,
                stepType: type,
                stepName: name,
                exampleName: exName,
                hasIn: ex.in !== undefined,
                hasOut: ex.out !== undefined,
                hasMapping: ex.mapping !== undefined,
                in: ex.in,
                out: ex.out,
                mapping: ex.mapping,
              });
            }
          }
        }

        const result = {
          flow: flowName,
          count: examples.length,
          examples,
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
