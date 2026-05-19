/**
 * Shared resolver for the export name to import from a flow component's
 * package.
 *
 * Both `walkeros bundle` and `walkeros setup` need to know which named export
 * (or default) to pull off a package referenced by a flow component. The
 * precedence chain is:
 *
 * 1. `flow.<kind>.<id>.import` if set (named export selector at the step).
 * 2. `flow.config.bundle.packages[<package>].imports[0]` if set.
 * 3. Otherwise undefined; the caller falls back to the package's `default`
 *    export.
 *
 * This lives in `cli/src/core/` so both `commands/bundle/*` and
 * `commands/setup/*` import the same function. Duplicating the chain is how
 * setup ended up out of sync with bundle (Bug F: `setup destination.pubsub`
 * routed through BigQuery's setup because it ignored the `code` field and
 * always grabbed `mod.default`).
 */

import type { Flow } from '@walkeros/core';

export type ComponentKind = 'source' | 'destination' | 'store';

export type ResolveSource = 'import' | 'imports' | 'default';

export interface ResolvedExportName {
  /**
   * The named export to pull off the imported module, or `undefined` to
   * indicate the caller should use the package's `default` export.
   */
  exportName: string | undefined;
  /** Which precedence step produced the result (useful for diagnostics). */
  source: ResolveSource;
}

interface FlowStepView {
  package?: string;
  import?: string;
}

function getStep(
  flow: Flow,
  kind: ComponentKind,
  id: string,
): FlowStepView | undefined {
  switch (kind) {
    case 'source':
      return flow.sources?.[id];
    case 'destination':
      return flow.destinations?.[id];
    case 'store':
      return flow.stores?.[id];
  }
}

function getBundlePackages(
  flow: Flow,
): Record<string, Flow.BundlePackage> | undefined {
  return flow.config?.bundle?.packages;
}

/**
 * Read the first entry of `bundle.packages[<package>].imports` if it is a
 * non-empty string. Returns `undefined` otherwise.
 */
function readFirstImport(
  packages: Record<string, Flow.BundlePackage> | undefined,
  packageName: string | undefined,
): string | undefined {
  if (!packages || !packageName) return undefined;
  const pkg = packages[packageName];
  if (!pkg || !pkg.imports || pkg.imports.length === 0) return undefined;
  const first = pkg.imports[0];
  return typeof first === 'string' && first.length > 0 ? first : undefined;
}

/**
 * Resolve the export name to import for a flow component's package.
 *
 * See module docs for the precedence chain. Inline code (`code` is an object)
 * doesn't enter this resolver at all — setup rejects inline code at a higher
 * layer.
 */
export function resolveExportName(
  flow: Flow,
  kind: ComponentKind,
  id: string,
): ResolvedExportName {
  const step = getStep(flow, kind, id);
  if (!step) return { exportName: undefined, source: 'default' };

  const packageName = step.package;
  const importName = step.import;

  // 1. Explicit `import` field on the step wins.
  if (typeof importName === 'string' && importName.length > 0) {
    return { exportName: importName, source: 'import' };
  }

  // 2. Fallback to bundle.packages[pkg].imports[0].
  const firstImport = readFirstImport(getBundlePackages(flow), packageName);
  if (firstImport) {
    return { exportName: firstImport, source: 'imports' };
  }

  // 3. Default export.
  return { exportName: undefined, source: 'default' };
}
