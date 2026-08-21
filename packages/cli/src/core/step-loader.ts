/**
 * Shared step-package loader.
 *
 * One code path from "a step's package + pinned version" to "a loaded
 * module": normalize the pin with the exact bundle precedence
 * (applyStepPackages), download the package and its transitive deps with
 * the same pacote pipeline and caches the bundler uses, resolve the
 * package's entry file, and import it. `walkeros setup` consumes the
 * loaded module; keeping acquisition identical to bundle guarantees setup
 * can never act on a different package version than the bundle ships.
 */
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs-extra';
import type { Flow, Logger } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { getTmpPath } from './tmp.js';
import { applyStepPackages, getFlowSection } from './step-packages.js';
import {
  downloadPackagesWithResolution,
  loadNpmConfigForPacote,
} from './package-manager.js';

export type StepKind = 'source' | 'destination' | 'store';

export interface ResolvedStepPackage {
  /** Bare package name after normalization (inline version stripped, local path replaced by synthetic key). */
  packageName: string;
  /** Effective bundle entry: version pin and/or local path per bundle precedence. */
  spec: Flow.BundlePackage;
  /** flow.config.bundle.overrides, for transitive pins. */
  overrides: Record<string, string>;
  /** Deep clone of the flow with step.package rewritten to bare names; the input flow is never mutated. */
  normalizedFlow: Flow;
}

const KIND_TO_SECTION = {
  source: 'sources',
  destination: 'destinations',
  store: 'stores',
} as const;

/**
 * Resolve the effective package spec for one step by running the SAME
 * normalization the bundler runs over the whole flow (applyStepPackages),
 * on a clone so the caller's flow stays untouched. The clone comes back as
 * `normalizedFlow` with `step.package` rewritten to the bare name, which is
 * also what resolveExportName needs to match `bundle.packages[pkg].imports`.
 */
export function resolveStepPackage(
  flow: Flow,
  kind: StepKind,
  id: string,
  logger: Logger.Instance,
): ResolvedStepPackage {
  const normalizedFlow = structuredClone(flow);
  const packages: Record<string, Flow.BundlePackage> = structuredClone(
    normalizedFlow.config?.bundle?.packages ?? {},
  );
  applyStepPackages(normalizedFlow, packages, logger);

  const bucket = getFlowSection(normalizedFlow, KIND_TO_SECTION[kind]);
  const step = bucket?.[id];
  if (!step) {
    const available = Object.keys(bucket ?? {}).join(', ') || '(none)';
    throw new Error(
      `${kind} "${id}" not found in flow. Available: ${available}`,
    );
  }
  if (typeof step.package !== 'string') {
    throw new Error(
      `${kind}.${id} has no "package" (inline code cannot be set up).`,
    );
  }

  return {
    packageName: step.package,
    spec: packages[step.package] ?? {},
    overrides: normalizedFlow.config?.bundle?.overrides ?? {},
    normalizedFlow,
  };
}

/** Condition keys probed, in order, when exports['.'] is an object. */
const ENTRY_CONDITIONS = ['import', 'default', 'node', 'require'] as const;

function pickEntryTarget(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (!isObject(value)) return undefined;
  for (const condition of ENTRY_CONDITIONS) {
    const target = pickEntryTarget(value[condition]);
    if (target !== undefined) return target;
  }
  return undefined;
}

/**
 * Resolve the entry file of an extracted package for a real Node import:
 * exports (string or "." subpath, import/default/node/require conditions),
 * then module, then main, then index.js. TypeScript entries are rejected
 * with a targeted message: the bundler can compile them, Node cannot.
 */
export async function resolvePackageEntry(packageDir: string): Promise<string> {
  const pkgJsonPath = path.join(packageDir, 'package.json');
  let pkgJson: Record<string, unknown>;
  try {
    pkgJson = await fs.readJson(pkgJsonPath);
  } catch {
    throw new Error(
      `No readable package.json in ${packageDir}. ` +
        `A "path" package used with setup must be a real package directory.`,
    );
  }

  const exportsField: unknown = pkgJson.exports;
  const fromExports =
    exportsField !== undefined
      ? pickEntryTarget(
          isObject(exportsField) && '.' in exportsField
            ? exportsField['.']
            : exportsField,
        )
      : undefined;
  const entryRel =
    fromExports ??
    (typeof pkgJson.module === 'string' ? pkgJson.module : undefined) ??
    (typeof pkgJson.main === 'string' ? pkgJson.main : undefined) ??
    'index.js';

  if (entryRel.endsWith('.ts') || entryRel.endsWith('.tsx')) {
    throw new Error(
      `Entry ${entryRel} of ${packageDir} is TypeScript. Setup imports ` +
        `packages with Node at runtime; point config.bundle.packages ` +
        `"path" at a built package (with dist output), not sources.`,
    );
  }

  const entryAbs = path.join(packageDir, entryRel);
  if (!(await fs.pathExists(entryAbs))) {
    throw new Error(
      `Entry file ${entryRel} declared by ${pkgJsonPath} does not exist.`,
    );
  }
  return entryAbs;
}

export interface LoadStepOptions {
  configDir?: string;
  tmpDir?: string;
  cache?: boolean;
  logger: Logger.Instance;
}

export interface LoadedStepPackage {
  module: Record<string, unknown>;
  packageName: string;
  normalizedFlow: Flow;
  /** Extracted package dir inside the install tree (for diagnostics/tests). */
  packageDir: string;
  /** Temp install root. Caller MUST remove it, and only AFTER the component lifecycle completes (packages lazy-load files, e.g. grpc .proto, at init/setup time). */
  installDir: string;
}

/**
 * Acquire and import one step's package. Downloads run through the same
 * pipeline and caches as `walkeros bundle` (exact pins are served from the
 * package cache offline; latest/range specs re-resolve against the
 * registry at most daily; `path` entries never touch the network).
 *
 * The returned installDir must be removed by the caller, and only after
 * the component's lifecycle (init/setup/destroy) has completed: packages
 * may lazy-load files from their install tree at call time.
 */
export async function loadStepPackage(
  flow: Flow,
  kind: StepKind,
  id: string,
  opts: LoadStepOptions,
): Promise<LoadedStepPackage> {
  const { packageName, spec, overrides, normalizedFlow } = resolveStepPackage(
    flow,
    kind,
    id,
    opts.logger,
  );

  const npmConfig = await loadNpmConfigForPacote(opts.configDir);
  // mkdtemp guarantees a unique tree per load: concurrent loads must never
  // share an installDir, since each caller removes its tree when done.
  await fs.ensureDir(getTmpPath(opts.tmpDir));
  const installDir = await fs.mkdtemp(
    getTmpPath(opts.tmpDir, 'walkeros-setup-'),
  );

  try {
    const { packagePaths } = await downloadPackagesWithResolution(
      [
        {
          name: packageName,
          version: spec.version || 'latest',
          ...(spec.path ? { path: spec.path } : {}),
        },
      ],
      installDir,
      opts.logger,
      opts.cache ?? true,
      opts.configDir,
      opts.tmpDir,
      overrides,
      npmConfig,
    );

    const packageDir = packagePaths.get(packageName);
    if (!packageDir) {
      throw new Error(
        `Acquisition resolved no install path for ${packageName}.`,
      );
    }

    const entry = await resolvePackageEntry(packageDir);
    const module: Record<string, unknown> = await import(
      pathToFileURL(entry).href
    );
    return { module, packageName, normalizedFlow, packageDir, installDir };
  } catch (error) {
    await fs.remove(installDir).catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load ${packageName} for ${kind}.${id}: ${message}\n` +
        `Setup fetches the flow's pinned package from the npm registry, ` +
        `sharing the bundle cache. If you are offline, run once online to ` +
        `warm the cache (exact version pins stay cached), or point ` +
        `config.bundle.packages["${packageName}"].path at a local built package.`,
      { cause: error },
    );
  }
}
