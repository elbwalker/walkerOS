/**
 * Step-package normalization shared by bundle and setup.
 *
 * Pure flow-config logic: which packages do the flow's steps declare, and
 * what is the effective {name, version | path} for each after merging inline
 * step specs with config.bundle.packages pins. Lives in core/ so both
 * commands/bundle/* and commands/setup/* run the exact same precedence
 * (a bundle pin always wins; an unversioned bundle entry is filled from the
 * first inline version; conflicting inline versions with no pin throw;
 * local paths become synthetic packageNameToVariable keys).
 */
import type { Flow, Logger } from '@walkeros/core';
import { packageNameToVariable } from '@walkeros/core';

/**
 * Type-narrowed accessor for a Flow section. Returns the typed step record
 * (or undefined) — exhaustive switch over the literal-union parameter avoids
 * a generic indexed-access cast.
 *
 * Returns the union of all section types when the caller passes a runtime
 * variable. Call sites that need a specific section type access the field
 * directly (e.g. `flow.sources`).
 */
export type FlowStepRecord =
  | Record<string, Flow.Source>
  | Record<string, Flow.Destination>
  | Record<string, Flow.Transformer>
  | Record<string, Flow.Store>;
export function getFlowSection(
  flow: Flow,
  section: 'sources' | 'destinations' | 'transformers' | 'stores',
): FlowStepRecord | undefined {
  switch (section) {
    case 'sources':
      return flow.sources;
    case 'destinations':
      return flow.destinations;
    case 'transformers':
      return flow.transformers;
    case 'stores':
      return flow.stores;
  }
}

/**
 * Split a step package spec into bare name and optional version suffix.
 * `@walkeros/x@1.2.3` → { name: '@walkeros/x', version: '1.2.3' }.
 * The scope `@` at index 0 is never a separator. A trailing `@` is ignored.
 * Alias/git/file suffixes are not interpreted — the resolver handles or
 * rejects them downstream.
 */
export function parsePackageSpec(spec: string): {
  name: string;
  version?: string;
} {
  const at = spec.lastIndexOf('@');
  if (at <= 0) return { name: spec };
  const version = spec.slice(at + 1);
  return version
    ? { name: spec.slice(0, at), version }
    : { name: spec.slice(0, at) };
}

/**
 * Detects destination packages from flow configuration.
 * Extracts package names from destinations that have explicit 'package' field.
 */
/**
 * Detects packages from a flow config section (sources, destinations, transformers, stores).
 * Extracts package names from steps that have an explicit 'package' field.
 */
export function detectStepPackages(
  flowSettings: Flow,
  section: 'sources' | 'destinations' | 'transformers' | 'stores',
): Set<string> {
  const packages = new Set<string>();
  const steps = getFlowSection(flowSettings, section);

  if (steps) {
    for (const [, stepConfig] of Object.entries(steps)) {
      if (typeof stepConfig !== 'object' || stepConfig === null) continue;
      // Require explicit package field
      if (typeof stepConfig.package === 'string') {
        packages.add(stepConfig.package);
      }
    }
  }

  return packages;
}

/**
 * Collects all package names declared in flow steps.
 * Returns both npm packages and local paths — caller handles routing.
 */
export function collectAllStepPackages(flowSettings: Flow): Set<string> {
  const allPackages = new Set<string>();
  const sections = [
    'sources',
    'destinations',
    'transformers',
    'stores',
  ] as const;

  for (const section of sections) {
    for (const pkg of detectStepPackages(flowSettings, section)) {
      allPackages.add(pkg);
    }
  }

  return allPackages;
}

/**
 * Auto-adds every step-declared package (sources, destinations, transformers,
 * stores) to `packages`, mutating `flowSettings` in place so each step's
 * `package` field points at the key that ends up in `packages`.
 *
 * Local paths (`.` or `/` prefixed) are normalized to a synthetic
 * `packageNameToVariable` key so the regular default-import codegen wires
 * them up automatically.
 *
 * npm specs go through `parsePackageSpec` to split an inline version
 * (`@walkeros/x@1.2.3`) from the bare name. Precedence policy:
 * - An explicit `config.bundle.packages` version always wins; a disagreeing
 *   inline version only warns (bundle pin is authoritative).
 * - An unversioned bundle entry is filled from the first inline version seen
 *   for that bare name, preserving any other fields already on the entry.
 * - Two different inline versions for the same bare name, with no bundle
 *   pin to arbitrate, are ambiguous — throw naming both steps' versions
 *   rather than silently picking one.
 * - Identical inline versions across steps are fine (no-op).
 * Alias/git/file suffixes are not special-cased: `parsePackageSpec` splits on
 * the last `@` and the resolver handles or rejects the rest downstream.
 */
export function applyStepPackages(
  flowSettings: Flow,
  packages: Record<string, Flow.BundlePackage>,
  logger: Logger.Instance,
): void {
  const stepPackages = collectAllStepPackages(flowSettings);
  // Bundle-pinned version per bare name, captured the first time each name is
  // encountered — i.e. before this function's own fill-ins can be mistaken
  // for a real `config.bundle.packages` pin on a later iteration.
  const originalVersions = new Map<string, string | undefined>();
  // Inline version already seen per bare name (with no real bundle pin),
  // used to detect a second, different inline version for the same name.
  const inlineSeen = new Map<string, string>();

  const rewriteSteps = (from: string, to: string): void => {
    for (const section of [
      'sources',
      'destinations',
      'transformers',
      'stores',
    ] as const) {
      const steps = getFlowSection(flowSettings, section);
      if (!steps) continue;
      for (const step of Object.values(steps)) {
        if (step.package === from) {
          step.package = to;
        }
      }
    }
  };

  for (const pkg of stepPackages) {
    const isLocalPath = pkg.startsWith('.') || pkg.startsWith('/');

    if (isLocalPath) {
      // Normalize: convert path-based package: to packages section entry.
      // The synthetic key acts as the package name for downstream codegen,
      // so the regular default-import flow wires it up automatically.
      const varName = packageNameToVariable(pkg);
      if (!packages[varName]) {
        packages[varName] = {
          path: pkg,
        };
      }

      // Rewrite all components that reference the raw path to point at the
      // synthetic packages-section key instead.
      rewriteSteps(pkg, varName);
      continue;
    }

    const { name, version } = parsePackageSpec(pkg);

    if (!originalVersions.has(name)) {
      originalVersions.set(name, packages[name]?.version);
    }
    const bundlePinnedVersion = originalVersions.get(name);

    if (name !== pkg) {
      // Rewrite every step that declared the versioned spec to the bare
      // name, mirroring the local-path rewrite above.
      rewriteSteps(pkg, name);
    }

    if (version && !bundlePinnedVersion) {
      const seen = inlineSeen.get(name);
      if (seen !== undefined && seen !== version) {
        throw new Error(
          `Conflicting inline versions for ${name}: "${seen}" and "${version}" are ` +
            `declared by different steps. Pin one version in config.bundle.packages.`,
        );
      }
      inlineSeen.set(name, version);
    }

    const existing = packages[name];
    if (!existing) {
      packages[name] = version ? { version } : {};
    } else if (version) {
      if (!existing.version) {
        existing.version = version; // fill an unversioned bundle entry
      } else if (existing.version !== version) {
        logger.warn(
          `Package ${name}: config.bundle.packages pins ${existing.version}; ` +
            `a step declares ${version} inline. Using the bundle pin.`,
        );
      }
    }
  }
}
