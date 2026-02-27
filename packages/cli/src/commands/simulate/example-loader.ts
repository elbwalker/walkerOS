import type { Flow } from '@walkeros/core';

export type StepType = 'source' | 'transformer' | 'destination';

export interface ExampleLookupResult {
  stepType: StepType;
  stepName: string;
  exampleName: string;
  example: { in?: unknown; mapping?: unknown; out?: unknown };
}

/**
 * Find a named example in a flow config.
 *
 * Searches sources, transformers, and destinations for a matching example.
 * If --step is provided (e.g. "destination.gtag"), looks only in that step.
 * If not, searches all steps and errors if ambiguous.
 *
 * @param config - Raw (unresolved) flow config with examples intact
 * @param exampleName - Name of the example to find
 * @param stepTarget - Optional step target in "type.name" format
 * @returns The found example with its location
 */
export function findExample(
  config: Flow.Config,
  exampleName: string,
  stepTarget?: string,
): ExampleLookupResult {
  if (stepTarget) {
    return findExampleInStep(config, exampleName, stepTarget);
  }

  return findExampleAcrossSteps(config, exampleName);
}

function findExampleInStep(
  config: Flow.Config,
  exampleName: string,
  stepTarget: string,
): ExampleLookupResult {
  const dotIndex = stepTarget.indexOf('.');
  if (dotIndex === -1) {
    throw new Error(
      `Invalid --step format: "${stepTarget}". Expected "type.name" (e.g. "destination.gtag")`,
    );
  }

  const type = stepTarget.substring(0, dotIndex) as StepType;
  const name = stepTarget.substring(dotIndex + 1);

  const stepMap = getStepMap(config, type);
  if (!stepMap) {
    throw new Error(`No ${type}s found in flow config`);
  }

  const step = stepMap[name];
  if (!step) {
    const available = Object.keys(stepMap).join(', ');
    throw new Error(`${type} "${name}" not found. Available: ${available}`);
  }

  const examples = (step as { examples?: Record<string, unknown> }).examples;
  if (!examples || !examples[exampleName]) {
    const available = examples ? Object.keys(examples).join(', ') : 'none';
    throw new Error(
      `Example "${exampleName}" not found in ${type} "${name}". Available: ${available}`,
    );
  }

  return {
    stepType: type,
    stepName: name,
    exampleName,
    example: examples[exampleName] as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
    },
  };
}

function findExampleAcrossSteps(
  config: Flow.Config,
  exampleName: string,
): ExampleLookupResult {
  const matches: ExampleLookupResult[] = [];

  const stepTypes: StepType[] = ['source', 'transformer', 'destination'];

  for (const type of stepTypes) {
    const stepMap = getStepMap(config, type);
    if (!stepMap) continue;

    for (const [name, step] of Object.entries(stepMap)) {
      const examples = (step as { examples?: Record<string, unknown> })
        .examples;
      if (examples && examples[exampleName]) {
        matches.push({
          stepType: type,
          stepName: name,
          exampleName,
          example: examples[exampleName] as {
            in?: unknown;
            mapping?: unknown;
            out?: unknown;
          },
        });
      }
    }
  }

  if (matches.length === 0) {
    throw new Error(`Example "${exampleName}" not found in any step`);
  }

  if (matches.length > 1) {
    const locations = matches
      .map((m) => `${m.stepType}.${m.stepName}`)
      .join(', ');
    throw new Error(
      `Example "${exampleName}" found in multiple steps: ${locations}. Use --step to disambiguate.`,
    );
  }

  return matches[0];
}

function getStepMap(
  config: Flow.Config,
  type: StepType,
): Record<string, unknown> | undefined {
  switch (type) {
    case 'source':
      return config.sources as Record<string, unknown> | undefined;
    case 'transformer':
      return config.transformers as Record<string, unknown> | undefined;
    case 'destination':
      return config.destinations as Record<string, unknown> | undefined;
    default:
      throw new Error(
        `Invalid step type: "${type}". Must be "source", "transformer", or "destination"`,
      );
  }
}
