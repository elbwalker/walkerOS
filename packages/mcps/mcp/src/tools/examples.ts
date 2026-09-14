import { z } from 'zod';
import { loadJsonConfig } from '@walkeros/cli';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPackage, mcpResult, mcpError } from '@walkeros/core';
import type { Flow } from '@walkeros/core';
import { ExamplesListOutputShape } from '../schemas/output.js';
import { getPackageBaseUrl, CLIENT_HEADER } from '../catalog.js';

import type { ToolSpec } from '../tool-spec.js';

const TITLE = 'Flow Examples';
const DESCRIPTION =
  'List all step examples in a walkerOS flow configuration. ' +
  'Shows example names, step locations, and in/out shapes. ' +
  'Inline examples on a step take precedence; steps without inline examples ' +
  'fall back to the examples shipped by their referenced package. ' +
  'Each result is tagged with its source ("inline" or "package"). ' +
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
    type ExampleItem = {
      step: string;
      stepType: string;
      stepName: string;
      exampleName: string;
      source: 'inline' | 'package';
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
    };
    const examples: ExampleItem[] = [];

    const toItems = (
      stepExamples: Flow.StepExamples,
      type: string,
      name: string,
      source: 'inline' | 'package',
    ): ExampleItem[] => {
      const items: ExampleItem[] = [];
      for (const [exName, ex] of Object.entries(stepExamples)) {
        if (!includeHidden && ex.public === false) continue;
        items.push({
          step: `${type}.${name}`,
          stepType: type,
          stepName: name,
          exampleName: exName,
          source,
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
      return items;
    };

    // Pull a referenced package's shipped step examples via the same path
    // package_get uses. A failed fetch must not break the whole tool: the
    // step is skipped and inline examples from other steps still return.
    const baseUrl = getPackageBaseUrl();
    const loadPackageExamples = async (
      packageName: string,
    ): Promise<Flow.StepExamples | undefined> => {
      try {
        const info = await fetchPackage(packageName, {
          baseUrl,
          client: CLIENT_HEADER,
        });
        const stepExamples = (info.examples as { step?: unknown } | undefined)
          ?.step;
        if (stepExamples && typeof stepExamples === 'object')
          return stepExamples as Flow.StepExamples;
      } catch {
        // Swallow: graceful fallback skip for this package.
      }
      return undefined;
    };

    const stepTypes = [
      { key: 'sources' as const, type: 'source' },
      { key: 'transformers' as const, type: 'transformer' },
      { key: 'destinations' as const, type: 'destination' },
    ];

    for (const { key, type } of stepTypes) {
      const refs = flowSettings[key] || {};
      for (const [name, ref] of Object.entries(refs)) {
        // Apply step filter
        if (step && `${type}.${name}` !== step) continue;

        // Inline examples take precedence over package-shipped ones.
        if (ref.examples) {
          examples.push(
            ...toItems(ref.examples as Flow.StepExamples, type, name, 'inline'),
          );
          continue;
        }

        // No inline examples: fall back to the referenced package's shipped
        // examples (only for refs that actually name a package).
        if (!ref.package) continue;
        const packageExamples = await loadPackageExamples(ref.package);
        if (packageExamples)
          examples.push(...toItems(packageExamples, type, name, 'package'));
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
        'No examples found. Add examples to step entries, or reference a package that ships examples (see package_get).',
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
