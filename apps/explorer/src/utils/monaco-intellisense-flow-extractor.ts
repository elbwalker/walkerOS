import type { IntelliSenseContext, PackageInfo } from '../types/intellisense';

/**
 * Extract IntelliSense context from a Flow.Setup JSON string.
 *
 * Parses the JSON, walks setup → configs → steps, and collects
 * all discoverable variables, definitions, step names, packages,
 * platform, and contract entities.
 *
 * Returns `{}` for invalid JSON or non-Flow structures.
 * Pure function — no side effects, no state.
 */
export function extractFlowIntelliSenseContext(
  json: string,
): Partial<IntelliSenseContext> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {};
  }

  if (!isFlowSetup(parsed)) return {};

  const variables: Record<string, string | number | boolean> = {};
  const definitions: Record<string, unknown> = {};
  const sources: string[] = [];
  const destinations: string[] = [];
  const transformers: string[] = [];
  const packages: PackageInfo[] = [];
  const contractEntities: Array<{ entity: string; actions: string[] }> = [];
  let platform: 'web' | 'server' | undefined;

  // Setup-level
  mergeVars(variables, parsed.variables);
  mergeDefs(definitions, parsed.definitions);
  extractContract(contractEntities, parsed.contract);

  // Walk each flow config
  for (const config of Object.values(parsed.flows)) {
    if (!isObject(config)) continue;

    // Platform detection (first match wins)
    if (!platform) {
      if ('web' in config) platform = 'web';
      else if ('server' in config) platform = 'server';
    }

    // Config-level variables/definitions/contract
    mergeVars(variables, config.variables);
    mergeDefs(definitions, config.definitions);
    extractContract(contractEntities, config.contract);

    // Sources
    if (isObject(config.sources)) {
      for (const [name, ref] of Object.entries(config.sources)) {
        sources.push(name);
        if (isObject(ref)) {
          mergeVars(variables, ref.variables);
          mergeDefs(definitions, ref.definitions);
          if (typeof ref.package === 'string') {
            packages.push({
              package: ref.package,
              shortName: name,
              type: 'source',
              platform: platform || 'web',
            });
          }
        }
      }
    }

    // Destinations
    if (isObject(config.destinations)) {
      for (const [name, ref] of Object.entries(config.destinations)) {
        destinations.push(name);
        if (isObject(ref)) {
          mergeVars(variables, ref.variables);
          mergeDefs(definitions, ref.definitions);
          if (typeof ref.package === 'string') {
            packages.push({
              package: ref.package,
              shortName: name,
              type: 'destination',
              platform: platform || 'web',
            });
          }
        }
      }
    }

    // Transformers
    if (isObject(config.transformers)) {
      for (const [name, ref] of Object.entries(config.transformers)) {
        transformers.push(name);
        if (isObject(ref)) {
          mergeVars(variables, ref.variables);
          mergeDefs(definitions, ref.definitions);
          if (typeof ref.package === 'string') {
            packages.push({
              package: ref.package,
              shortName: name,
              type: 'transformer',
              platform: platform || 'web',
            });
          }
        }
      }
    }
  }

  const result: Partial<IntelliSenseContext> = {
    variables,
    definitions,
    stepNames: { sources, destinations, transformers },
  };

  if (platform) result.platform = platform;
  if (packages.length > 0) result.packages = packages;
  if (contractEntities.length > 0) result.contract = contractEntities;

  return result;
}

// --- Helpers ---

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFlowSetup(v: unknown): v is {
  version: number;
  flows: Record<string, unknown>;
  [k: string]: unknown;
} {
  return isObject(v) && 'version' in v && 'flows' in v && isObject(v.flows);
}

function isPrimitive(v: unknown): v is string | number | boolean {
  return (
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
  );
}

function mergeVars(
  target: Record<string, string | number | boolean>,
  source: unknown,
): void {
  if (!isObject(source)) return;
  for (const [k, v] of Object.entries(source)) {
    if (isPrimitive(v)) target[k] = v;
  }
}

function mergeDefs(target: Record<string, unknown>, source: unknown): void {
  if (!isObject(source)) return;
  for (const [k, v] of Object.entries(source)) {
    target[k] = v;
  }
}

function extractContract(
  target: Array<{ entity: string; actions: string[] }>,
  contract: unknown,
): void {
  if (!isObject(contract)) return;
  for (const [key, value] of Object.entries(contract)) {
    if (key.startsWith('$') || !isObject(value)) continue;
    // Avoid duplicates when merging setup + config contracts
    const existing = target.find((e) => e.entity === key);
    const actions = Object.keys(value);
    if (existing) {
      for (const a of actions) {
        if (!existing.actions.includes(a)) existing.actions.push(a);
      }
    } else {
      target.push({ entity: key, actions });
    }
  }
}
