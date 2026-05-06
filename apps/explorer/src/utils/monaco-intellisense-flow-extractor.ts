import type { IntelliSenseContext, PackageInfo } from '../types/intellisense';

/**
 * Extract IntelliSense context from a Flow.Json JSON string.
 *
 * Parses the JSON, walks root → flow → steps, and collects
 * all discoverable variables, step names, packages, platform, and
 * contract entities.
 *
 * Returns `{}` for invalid JSON or non-Flow structures.
 * Pure function, no side effects, no state.
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

  if (!isFlowConfig(parsed)) return {};

  const variables: Record<string, unknown> = {};
  const sources: string[] = [];
  const destinations: string[] = [];
  const transformers: string[] = [];
  const stores: string[] = [];
  const packages: PackageInfo[] = [];
  const contractEntities: Array<{ entity: string; actions: string[] }> = [];
  const contractRaw: Record<string, unknown> = {};
  let platform: 'web' | 'server' | undefined;

  // Config-level
  mergeVars(variables, parsed.variables);
  extractContract(contractEntities, parsed.contract);
  if (isObject(parsed.contract)) Object.assign(contractRaw, parsed.contract);

  // Walk each flow settings
  for (const settings of Object.values(parsed.flows)) {
    if (!isObject(settings)) continue;

    // Platform detection (first match wins) - reads config.platform in v4
    if (!platform && isObject(settings.config)) {
      const p = settings.config.platform;
      if (p === 'web' || p === 'server') platform = p;
    }

    // Settings-level variables/contract
    mergeVars(variables, settings.variables);
    extractContract(contractEntities, settings.contract);
    if (isObject(settings.contract))
      Object.assign(contractRaw, settings.contract);

    // Sources
    if (isObject(settings.sources)) {
      for (const [name, ref] of Object.entries(settings.sources)) {
        sources.push(name);
        if (isObject(ref)) {
          mergeVars(variables, ref.variables);
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
    if (isObject(settings.destinations)) {
      for (const [name, ref] of Object.entries(settings.destinations)) {
        destinations.push(name);
        if (isObject(ref)) {
          mergeVars(variables, ref.variables);
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
    if (isObject(settings.transformers)) {
      for (const [name, ref] of Object.entries(settings.transformers)) {
        transformers.push(name);
        if (isObject(ref)) {
          mergeVars(variables, ref.variables);
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

    // Stores — collect IDs and cascade their variables
    if (isObject(settings.stores)) {
      for (const [name, ref] of Object.entries(settings.stores)) {
        stores.push(name);
        if (isObject(ref)) {
          mergeVars(variables, ref.variables);
        }
      }
    }
  }

  const result: Partial<IntelliSenseContext> = {
    variables,
    stepNames: { sources, destinations, transformers },
  };

  if (platform) result.platform = platform;
  if (packages.length > 0) result.packages = packages;
  if (contractEntities.length > 0) result.contract = contractEntities;
  if (Object.keys(contractRaw).length > 0) result.contractRaw = contractRaw;
  if (stores.length > 0) result.stores = stores;

  return result;
}

// --- Helpers ---

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFlowConfig(v: unknown): v is {
  version: number;
  flows: Record<string, unknown>;
  [k: string]: unknown;
} {
  return isObject(v) && 'version' in v && 'flows' in v && isObject(v.flows);
}

function mergeVars(target: Record<string, unknown>, source: unknown): void {
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
    // Avoid duplicates when merging config + settings contracts
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
