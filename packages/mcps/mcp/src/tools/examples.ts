import { z } from 'zod';
import {
  createLogger,
  getErrorMessage,
  mcpResult,
  mcpError,
} from '@walkeros/core';
import {
  readStepPackageInfo,
  resolveExportName,
  resolveStepPackage,
  selectDevExamples,
  type ResolvedStepPackage,
  type StepPackageInfo,
} from '@walkeros/cli/dev';
import { ExamplesListOutputShape } from '../schemas/output.js';
import { CLIENT_HEADER } from '../catalog.js';

import type { ToolSpec } from '../tool-spec.js';
import { parseToolInput } from './parse-input.js';
import { isFlowJson, stepExamplesOf, type StepExampleView } from './narrow.js';
import {
  HINT_OUT_OF_PROCESS,
  refusalHint,
  type FlowRuntime,
} from '../runtime/types.js';

/** Upper bound on distinct package example lookups per call. */
export const MAX_PACKAGE_LOOKUPS = 25;

// Resolving a step's package logs only a warning (a bundle pin over a
// disagreeing inline version); each package example names the version read.
const LOGGER = createLogger();

const TITLE = 'Flow Examples';
const DESCRIPTION =
  'List all step examples in a walkerOS flow configuration. ' +
  'Shows example names, step locations, and in/out shapes. ' +
  'Inline examples on a step take precedence; steps without inline examples ' +
  'fall back to the examples shipped by their referenced package. ' +
  'Package examples are read at the version or local path the flow pins, and carry the version read. ' +
  'Each result is tagged with its source ("inline" or "package"). ' +
  'configPath: inline JSON, or a reference this server can read (locally a file path or an http(s) URL). ' +
  'Use this to discover available test fixtures and simulation data.';

const inputSchema = {
  configPath: z
    .string()
    .min(1)
    .describe(
      'A flow configuration: inline JSON, or a reference this server can read (locally a file path or an http(s) URL).',
    ),
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

export function createFlowExamplesToolSpec(runtime: FlowRuntime): ToolSpec {
  return {
    name: 'flow_examples',
    title: TITLE,
    description: DESCRIPTION,
    inputSchema,
    outputSchema: ExamplesListOutputShape,
    annotations,
    handler: (input) => flowExamplesHandlerBody(runtime, input),
  };
}

async function flowExamplesHandlerBody(runtime: FlowRuntime, input: unknown) {
  const parsed = parseToolInput(inputSchema, input);
  if (!parsed.ok) return parsed.error;
  const { configPath, flow, step, full, includeHidden } = parsed.data;
  try {
    const rawConfig = await runtime.load(configPath);
    if (!isFlowJson(rawConfig)) {
      throw new Error('Config is not a flow config: it has no flows object.');
    }

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
      version?: string;
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
      stepExamples: Record<string, StepExampleView>,
      type: string,
      name: string,
      source: 'inline' | 'package',
      version?: string,
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
          ...(version ? { version } : {}),
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

    // The directory a local path package resolves against, the same seam
    // flow_validate uses; absent where the runtime has no filesystem.
    const configDir = runtime.baseDir?.(configPath);

    type PackageRead =
      | { ok: true; info: StepPackageInfo }
      | { ok: false; reason: string };

    // One read per package, capped per call, so a config naming many
    // packages cannot fan out into an unbounded number of fetches. A
    // packages key has one source per flow, so the key is the read's key.
    const packageReads = new Map<string, Promise<PackageRead>>();
    let skippedPackages = false;
    const skippedExamples: string[] = [];
    const unreadable: string[] = [];
    const packageFor = (
      resolved: ResolvedStepPackage,
    ): Promise<PackageRead> | undefined => {
      const existing = packageReads.get(resolved.packageName);
      if (existing) return existing;
      if (packageReads.size >= MAX_PACKAGE_LOOKUPS) {
        skippedPackages = true;
        return undefined;
      }
      const read = readStepPackageInfo(resolved, {
        configDir,
        client: CLIENT_HEADER,
      }).then(
        (info): PackageRead => ({ ok: true, info }),
        (error: unknown): PackageRead => ({
          ok: false,
          reason: getErrorMessage(error),
        }),
      );
      packageReads.set(resolved.packageName, read);
      return read;
    };

    // The step examples of the step's own export: a multi-export package
    // ships `exportExamples` keyed by export name, the same rule simulate
    // uses (an export missing from the map has no examples).
    const stepExamplesFor = (
      info: StepPackageInfo,
      exportName: string | undefined,
    ): ReturnType<typeof stepExamplesOf> => {
      const selected = selectDevExamples(
        { examples: info.examples, exportExamples: info.exportExamples },
        exportName,
      );
      return stepExamplesOf(selected?.step);
    };

    const stepTypes = [
      { key: 'sources' as const, type: 'source' as const },
      { key: 'transformers' as const, type: 'transformer' as const },
      { key: 'destinations' as const, type: 'destination' as const },
    ];

    for (const { key, type } of stepTypes) {
      const refs = flowSettings[key] || {};
      for (const [name, ref] of Object.entries(refs)) {
        // Apply step filter
        if (step && `${type}.${name}` !== step) continue;

        // Inline examples take precedence over package-shipped ones.
        if (ref.examples) {
          examples.push(...toItems(ref.examples, type, name, 'inline'));
          continue;
        }

        // No inline examples: fall back to the examples of the package the
        // bundle would install (only for refs that actually name a package).
        if (!ref.package) continue;
        let resolved: ResolvedStepPackage;
        try {
          resolved = resolveStepPackage(flowSettings, type, name, LOGGER);
        } catch (error) {
          unreadable.push(`${type}.${name}: ${getErrorMessage(error)}`);
          continue;
        }
        const read = packageFor(resolved);
        if (!read) continue;
        const outcome = await read;
        if (!outcome.ok) {
          unreadable.push(
            `${type}.${name} (${resolved.label}): ${outcome.reason}`,
          );
          continue;
        }
        const { exportName } = resolveExportName(
          resolved.normalizedFlow,
          type,
          name,
        );
        const packageExamples = stepExamplesFor(outcome.info, exportName);
        if (!packageExamples) continue;
        examples.push(
          ...toItems(
            packageExamples.examples,
            type,
            name,
            'package',
            outcome.info.version,
          ),
        );
        for (const exampleName of packageExamples.skipped)
          skippedExamples.push(`${type}.${name}.${exampleName}`);
      }
    }

    const result = {
      flow: flowName,
      count: examples.length,
      examples,
    };

    const warnings: string[] = [];
    if (examples.length === 0) {
      warnings.push(
        'No examples found. Add examples to step entries, or reference a package that ships examples (see package_get).',
      );
    }
    if (skippedExamples.length > 0) {
      warnings.push(
        `Skipped ${skippedExamples.length} package example(s) that do not match the step example schema: ${skippedExamples.join(', ')}.`,
      );
    }
    if (unreadable.length > 0) {
      const list = unreadable.join('; ');
      warnings.push(
        `Could not read the package of ${unreadable.length} step(s), so their package examples are missing: ${list}${list.endsWith('.') ? '' : '.'}`,
      );
    }
    if (skippedPackages) {
      warnings.push(
        `Package examples were looked up for the first ${MAX_PACKAGE_LOOKUPS} packages only. Use step to narrow the result.`,
      );
    }
    const hints: { next: string[]; warnings?: string[] } = {
      next: [
        runtime.simulate
          ? 'Use flow_simulate with step and event to simulate'
          : HINT_OUT_OF_PROCESS,
      ],
      ...(warnings.length > 0 ? { warnings } : {}),
    };
    return mcpResult(result, hints);
  } catch (error) {
    return mcpError(
      error,
      refusalHint(error, 'Check configPath: expected a flow.json file'),
    );
  }
}
