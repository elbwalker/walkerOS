import type { Flow } from '@walkeros/core';

/**
 * Overrides structure for destination config properties.
 * Shape mirrors Collector.InitConfig.destinations but without requiring `code`.
 * Used with deepMerge at runtime to overlay simulate/mock/disabled flags.
 */
export interface PushOverrides {
  destinations?: Record<
    string,
    {
      config?: {
        simulate?: boolean;
        mock?: unknown;
        disabled?: boolean;
      };
    }
  >;
}

/**
 * Build collector overrides from --simulate and --mock CLI flags.
 *
 * - `--simulate destination.NAME` sets simulate: true on NAME
 * - `--mock destination.NAME=VALUE` sets mock: JSON-parsed VALUE on NAME
 * - Any destination NOT targeted by simulate or mock gets disabled: true
 * - Returns empty object if no flags are provided
 *
 * @throws if same destination appears in both simulate and mock
 * @throws if step format is invalid (missing `destination.` prefix)
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
  const mockNames = new Set<string>();
  const overrides: PushOverrides = { destinations: {} };

  // Parse --simulate flags
  for (const step of simulateFlags) {
    const name = parseDestinationStep(step);
    simulateNames.add(name);
    overrides.destinations![name] = { config: { simulate: true } };
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
    const name = parseDestinationStep(stepPart);

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

    overrides.destinations![name] = { config: { mock: parsedValue } };
  }

  // Simulate-implies-disabled: disable all other destinations
  const allDestinations = Object.keys(flowConfig.destinations ?? {});
  const targetedNames = new Set([...simulateNames, ...mockNames]);

  for (const destName of allDestinations) {
    if (!targetedNames.has(destName)) {
      overrides.destinations![destName] = { config: { disabled: true } };
    }
  }

  return overrides;
}

/**
 * Parse a step string in `destination.NAME` format and return NAME.
 * @throws if format is invalid
 */
function parseDestinationStep(step: string): string {
  const dotIndex = step.indexOf('.');
  if (dotIndex === -1) {
    throw new Error(
      `Invalid step format: "${step}". Expected "destination.NAME"`,
    );
  }

  const prefix = step.slice(0, dotIndex);
  const name = step.slice(dotIndex + 1);

  if (prefix !== 'destination') {
    throw new Error(
      `Unsupported step type: "${prefix}". Only "destination" is supported`,
    );
  }

  if (!name) {
    throw new Error(
      `Invalid step format: "${step}". Missing destination name after "destination."`,
    );
  }

  return name;
}
