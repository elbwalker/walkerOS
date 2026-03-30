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
  /** Path-specific transformer mocks: chainPath → { transformerId → mockValue } */
  transformerMocks?: Record<string, Record<string, unknown>>;
  transformers?: Record<
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
    } else if (type === 'transformer') {
      if (!overrides.transformers) overrides.transformers = {};
      overrides.transformers[name] = { simulate: true };
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
    const parsed = parseStep(stepPart);

    if (parsed.type === 'source') {
      throw new Error(
        `--mock is not supported for sources. Use --simulate source.${parsed.name}`,
      );
    }

    if (parsed.type === 'transformer' && !parsed.chainType) {
      throw new Error(
        `Use --mock destination.NAME.before.${parsed.name}=VALUE for path-specific transformer mocks`,
      );
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(valuePart);
    } catch {
      // If not valid JSON, use as raw string
      parsedValue = valuePart;
    }

    if (parsed.chainType && parsed.transformerId) {
      // Path-specific mock: destination.ga4.before.redact
      const chainPath = `destination.${parsed.name}.${parsed.chainType}`;
      if (!overrides.transformerMocks) overrides.transformerMocks = {};
      if (!overrides.transformerMocks[chainPath])
        overrides.transformerMocks[chainPath] = {};
      overrides.transformerMocks[chainPath][parsed.transformerId] = parsedValue;
    } else {
      // Simple destination mock (existing behavior)
      // Validate: same destination cannot be in both simulate and mock
      if (simulateNames.has(parsed.name)) {
        throw new Error(
          `Destination "${parsed.name}" cannot be in both --simulate and --mock`,
        );
      }

      mockNames.add(parsed.name);

      if (!overrides.destinations) overrides.destinations = {};
      overrides.destinations[parsed.name] = { config: { mock: parsedValue } };
    }
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

interface ParsedStep {
  type: 'source' | 'destination' | 'transformer';
  name: string;
  chainType?: 'before' | 'next';
  transformerId?: string;
}

/**
 * Parse a step string in `source.NAME` or `destination.NAME` format.
 * Also supports 4-part path notation: `destination.NAME.CHAIN.TRANSFORMER`
 * @throws if format is invalid
 */
function parseStep(step: string): ParsedStep {
  const parts = step.split('.');

  if (parts.length < 2) {
    throw new Error(
      `Invalid step format: "${step}". Expected "source.NAME" or "destination.NAME"`,
    );
  }

  const prefix = parts[0];
  if (prefix !== 'source' && prefix !== 'destination' && prefix !== 'transformer') {
    throw new Error(
      `Unsupported step type: "${prefix}". Use "source", "destination", or "transformer"`,
    );
  }

  const name = parts[1];
  if (!name) {
    throw new Error(
      `Invalid step format: "${step}". Missing name after "${prefix}."`,
    );
  }

  // Path-specific: destination.ga4.before.redact
  if (parts.length >= 4) {
    const chainType = parts[2];
    if (chainType !== 'before' && chainType !== 'next') {
      throw new Error(
        `Invalid chain type: "${chainType}". Use "before" or "next"`,
      );
    }
    const transformerId = parts[3];
    if (!transformerId) {
      throw new Error(
        `Invalid step format: "${step}". Missing transformer name after "${chainType}."`,
      );
    }
    return { type: prefix, name, chainType, transformerId };
  }

  // 3-part (destination.ga4.before without transformer) — invalid
  if (parts.length === 3) {
    throw new Error(
      `Invalid step format: "${step}". Specify a transformer: "${step}.TRANSFORMER_NAME"`,
    );
  }

  return { type: prefix, name };
}
