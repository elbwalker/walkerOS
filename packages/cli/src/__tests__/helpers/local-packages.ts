import fs from 'fs-extra';
import path from 'path';
import type { Flow } from '@walkeros/core';
import { isObject } from '@walkeros/core';

/**
 * Monorepo `path:` packages for tests that bundle against today's code (the
 * packages' built `dist`) rather than a registry release.
 *
 * Turbo builds and hashes only what packages/cli depends on, so a test that
 * reads another package's dist without that edge is neither scheduled nor
 * invalidated when the package changes. Every package pointed at the monorepo
 * here must therefore be reachable from cli's dependencies or devDependencies.
 */

export const packagesDir = path.resolve(__dirname, '../../../..');
const cliDir = path.join(packagesDir, 'cli');

function readManifest(dir: string): Record<string, unknown> | undefined {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) return undefined;
  const pkg: unknown = fs.readJSONSync(file);
  return isObject(pkg) ? pkg : undefined;
}

function walkerosNames(value: unknown): string[] {
  return isObject(value)
    ? Object.keys(value).filter((name) => name.startsWith('@walkeros/'))
    : [];
}

function scan(
  dir: string,
  depth: number,
  found: Map<string, string>,
): Map<string, string> {
  const name = readManifest(dir)?.name;
  if (typeof name === 'string' && name.startsWith('@walkeros/'))
    found.set(name, dir);
  if (depth >= 4) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (['node_modules', 'dist', 'src', 'coverage'].includes(entry.name))
      continue;
    if (entry.name.startsWith('.')) continue;
    scan(path.join(dir, entry.name), depth + 1, found);
  }
  return found;
}

let packageDirs: Map<string, string> | undefined;

/** Every @walkeros package directory of the monorepo, by package name. */
export function findPackageDirs(): Map<string, string> {
  packageDirs ??= scan(packagesDir, 0, new Map());
  return packageDirs;
}

let dependencyClosure: Set<string> | undefined;

/**
 * Names reachable from cli's dependencies and devDependencies, following each
 * monorepo package's own dependencies: the edges turbo builds and hashes.
 */
export function cliDependencyClosure(): Set<string> {
  if (dependencyClosure) return dependencyClosure;
  const dirs = findPackageDirs();
  const cli = readManifest(cliDir);
  const closure = new Set<string>();
  const visit = (name: string): void => {
    if (closure.has(name)) return;
    closure.add(name);
    const dir = dirs.get(name);
    const pkg = dir ? readManifest(dir) : undefined;
    for (const dep of walkerosNames(pkg?.dependencies)) visit(dep);
  };
  for (const name of [
    ...walkerosNames(cli?.dependencies),
    ...walkerosNames(cli?.devDependencies),
  ])
    visit(name);
  dependencyClosure = closure;
  return closure;
}

/** The monorepo directory of a package cli depends on. */
export function localPackageDir(name: string): string {
  if (!cliDependencyClosure().has(name))
    throw new Error(
      `${name} is bundled from the monorepo but is not in the packages/cli dependency closure`,
    );
  const dir = findPackageDirs().get(name);
  if (!dir) throw new Error(`${name} is not a package of the monorepo`);
  return dir;
}

/** A `bundle.packages` entry pointing at the monorepo package. */
export function localPackage(name: string): { path: string } {
  return { path: localPackageDir(name) };
}

/**
 * Points every monorepo package of a flow, and its @walkeros dependencies, at
 * the monorepo (in place). Packages named in `keep` stay as declared.
 */
export function injectLocalPaths(
  flow: Flow,
  options: { keep?: string[] } = {},
): void {
  const packages = flow.config?.bundle?.packages;
  if (!packages) return;
  const dirs = findPackageDirs();
  const add = (name: string): void => {
    if (!dirs.has(name) || options.keep?.includes(name)) return;
    if (packages[name]?.path) return;
    const dir = localPackageDir(name);
    packages[name] = { ...packages[name], path: dir };
    for (const dep of walkerosNames(readManifest(dir)?.dependencies)) add(dep);
  };
  for (const name of Object.keys(packages)) add(name);
}

/**
 * A copy of a flow config whose @walkeros packages (its steps' packages and
 * the collector) all come from the monorepo, so a test bundles this working
 * tree instead of the published release.
 */
export function withLocalPackages(config: Flow.Json): Flow.Json {
  const copy = structuredClone(config);
  for (const flow of Object.values(copy.flows)) {
    const config = flow.config;
    if (!config) continue;
    const packages = { ...config.bundle?.packages };
    const steps = [
      ...Object.values(flow.sources ?? {}),
      ...Object.values(flow.transformers ?? {}),
      ...Object.values(flow.destinations ?? {}),
      ...Object.values(flow.stores ?? {}),
    ];
    for (const name of [
      '@walkeros/collector',
      ...steps.map((step) => step.package),
    ]) {
      if (name) packages[name] ??= {};
    }
    config.bundle = { ...config.bundle, packages };
    injectLocalPaths(flow);
  }
  return copy;
}
