import type { Flow } from '@walkeros/core';

/**
 * Overrides structure for destination config properties.
 * Shape mirrors Collector.InitConfig.destinations but without requiring `code`.
 * Used with deepMerge at runtime to overlay mock/disabled flags.
 */
export interface PushOverrides {
  destinations?: Record<
    string,
    {
      config?: {
        mock?: unknown;
        disabled?: boolean;
      };
      env?: Record<string, unknown>;
      simulation?: string[];
    }
  >;
  sources?: Record<
    string,
    {
      simulate?: boolean;
    }
  >;
}

/**
 * Build collector overrides from --simulate and --mock CLI flags.
 *
 * - `--simulate destination.NAME` sets simulate: true on NAME
 * - `--simulate source.NAME` marks source for simulation
 * - `--mock destination.NAME=VALUE` sets mock: JSON-parsed VALUE on NAME
 * - Any destination NOT targeted by simulate or mock gets disabled: true
 * - Returns empty object if no flags are provided
 *
 * @throws if same destination appears in both simulate and mock
 * @throws if step format is invalid (missing `source.` or `destination.` prefix)
 * @throws if --mock is used with a source step
 */
export function buildOverrides(
  flags: { simulate?: string[]; mock?: string[] },
  flowConfig: Flow.Settings,
): PushOverrides {
  const simulateFlags = flags.simulate ?? [];
  const mockFlags = flags.mock ?? [];

  // No flags → no overrides
  if (simulateFlags.length === 0 && mockFlags.length === 0) {
    return {};
  }

  const simulateNames = new Set<string>();
  const sourceSimulateNames = new Set<string>();
  const mockNames = new Set<string>();
  const overrides: PushOverrides = {};

  // Parse --simulate flags
  for (const step of simulateFlags) {
    const { type, name } = parseStep(step);
    if (type === 'destination') {
      simulateNames.add(name);
      if (!overrides.destinations) overrides.destinations = {};
      overrides.destinations[name] = { config: { mock: {} } };
    } else {
      sourceSimulateNames.add(name);
      if (!overrides.sources) overrides.sources = {};
      overrides.sources[name] = { simulate: true };
    }
  }

  // Parse --mock flags
  for (const step of mockFlags) {
    const eqIndex = step.indexOf('=');
    if (eqIndex === -1) {
      throw new Error(
        `Invalid --mock format: "${step}". Expected destination.NAME=VALUE`,
      );
    }

    const stepPart = step.slice(0, eqIndex);
    const valuePart = step.slice(eqIndex + 1);
    const { type, name } = parseStep(stepPart);

    if (type === 'source') {
      throw new Error(
        `--mock is not supported for sources. Use --simulate source.${name}`,
      );
    }

    // Validate: same destination cannot be in both simulate and mock
    if (simulateNames.has(name)) {
      throw new Error(
        `Destination "${name}" cannot be in both --simulate and --mock`,
      );
    }

    mockNames.add(name);

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(valuePart);
    } catch {
      // If not valid JSON, use as raw string
      parsedValue = valuePart;
    }

    if (!overrides.destinations) overrides.destinations = {};
    overrides.destinations[name] = { config: { mock: parsedValue } };
  }

  // Simulate-implies-disabled: disable all other destinations
  const allDestinations = Object.keys(flowConfig.destinations ?? {});
  const targetedNames = new Set([...simulateNames, ...mockNames]);

  if (targetedNames.size > 0) {
    if (!overrides.destinations) overrides.destinations = {};
    for (const destName of allDestinations) {
      if (!targetedNames.has(destName)) {
        overrides.destinations[destName] = { config: { disabled: true } };
      }
    }
  }

  return overrides;
}

/**
 * Parse a step string in `source.NAME` or `destination.NAME` format.
 * @throws if format is invalid
 */
function parseStep(step: string): { type: 'source' | 'destination'; name: string } {
  const dotIndex = step.indexOf('.');
  if (dotIndex === -1) {
    throw new Error(
      `Invalid step format: "${step}". Expected "source.NAME" or "destination.NAME"`,
    );
  }

  const prefix = step.slice(0, dotIndex);
  const name = step.slice(dotIndex + 1);

  if (prefix !== 'source' && prefix !== 'destination') {
    throw new Error(
      `Unsupported step type: "${prefix}". Use "source" or "destination"`,
    );
  }

  if (!name) {
    throw new Error(
      `Invalid step format: "${step}". Missing name after "${prefix}."`,
    );
  }

  return { type: prefix, name };
}
