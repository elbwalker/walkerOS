/**
 * The recorded package tree: every package one build installed, exactly.
 *
 * A lockfile in all but name. Each entry is keyed by its install path (the
 * two layouts the bundler makes: `node_modules/<name>` and
 * `node_modules/<consumer>/node_modules/<name>`) and names the registry
 * package it holds (`name`, which differs from the path for an `npm:` alias),
 * its exact version, the tarball URL and the sha512 of the tarball's bytes.
 * `dependencies` lists the edges the bundler followed from that package:
 * its dependencies and its required peers, as declared.
 *
 * A build orchestrator records the tree a build reports and hands it back to
 * every later build of the same release, which then installs exactly it and
 * resolves nothing. This module is the one definition of the tree's shape,
 * its canonical form and digest, and the check every reader runs before it
 * trusts a tree. It imports no network code.
 */

import { createHash } from 'crypto';
import npa from 'npm-package-arg';
import semver from 'semver';
import { z } from '@walkeros/core/dev';

/** Current tree format version. */
export const PACKAGE_TREE_VERSION = 1;

/** A tree with more entries than this is refused. */
export const PACKAGE_TREE_MAX_ENTRIES = 5000;

/** One sha512 Subresource Integrity value, nothing else. */
const SHA512_INTEGRITY = /^sha512-[A-Za-z0-9+/]{86}==$/;

export const PackageTreeEntrySchema = z
  .object({
    name: z.string().min(1).describe('Registry name of the package'),
    version: z.string().min(1).describe('Exact version'),
    resolved: z.string().min(1).describe('Tarball URL on the registry'),
    integrity: z.string().min(1).describe('sha512 of the tarball bytes'),
    dependencies: z
      .record(z.string().min(1), z.string())
      .optional()
      .describe('Edges followed: dependencies and required peers'),
  })
  .strict();

export const PackageTreeSchema = z
  .object({
    version: z.literal(PACKAGE_TREE_VERSION),
    registry: z.string().min(1).describe('Registry every entry comes from'),
    before: z
      .string()
      .nullable()
      .describe('Release-age cutoff the tree was resolved under'),
    packages: z
      .record(z.string().min(1), PackageTreeEntrySchema)
      .describe('Entries by install path'),
  })
  .strict()
  .meta({ id: 'PackageTree', title: 'Recorded package tree' });

export type PackageTree = z.infer<typeof PackageTreeSchema>;
export type PackageTreeEntry = z.infer<typeof PackageTreeEntrySchema>;

/**
 * How a build installs its packages. Absent: resolved fresh, the zero-setup
 * default. `tree`: exactly a recorded tree. `resolve`: resolved under a
 * release-age cutoff, the installed tree handed to `onTree`.
 */
export type PackageInstall =
  | { tree: PackageTree }
  | {
      resolve: { before: Date; exempt: readonly string[] };
      onTree: (tree: PackageTree) => void;
    };

/** A tree that fails the check: its shape, its registry or its graph. */
export class PackageTreeError extends Error {
  readonly code = 'PACKAGE_TREE_INVALID';

  constructor(readonly problems: readonly string[]) {
    super(`Package tree refused: ${problems.join('; ')}`);
    this.name = 'PackageTreeError';
  }
}

/** Recursively key-sorted JSON, the one serialization the digest hashes. */
export function canonicalPackageTree(tree: PackageTree): string {
  return JSON.stringify(sortKeys(tree));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === 'object' && value !== null) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys(Reflect.get(value, key));
    }
    return sorted;
  }
  return value;
}

/** sha256 hex of the canonical form. */
export function packageTreeDigest(tree: PackageTree): string {
  return createHash('sha256').update(canonicalPackageTree(tree)).digest('hex');
}

/** A registry URL with exactly one trailing slash, or null when it is no URL. */
export function normalizeRegistry(registry: string): URL | null {
  try {
    const url = new URL(registry);
    if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`;
    return url;
  } catch {
    return null;
  }
}

/** True when `name` is a valid registry package name. */
export function isPackageName(name: string): boolean {
  try {
    const parsed = npa(`${name}@0.0.0`);
    return parsed.name === name && parsed.type === 'version';
  } catch {
    return false;
  }
}

/** The scope of a package name (`@scope`), or '' when it has none. */
export function scopeOf(name: string): string {
  return name.startsWith('@') ? name.slice(0, name.indexOf('/')) : '';
}

/** True when `name` starts with one of the `exempt` prefixes. */
export function isExemptName(name: string, exempt: readonly string[]): boolean {
  return exempt.some((prefix) => name.startsWith(prefix));
}

/**
 * True when an install name and the registry name it holds fall on different
 * sides of an exempt prefix: an alias that would borrow, or lose, exemption.
 */
export function aliasCrossesExemption(
  installName: string,
  realName: string,
  exempt: readonly string[],
): boolean {
  return isExemptName(installName, exempt) !== isExemptName(realName, exempt);
}

/**
 * The registry name an edge `depName: spec` installs: the alias target for an
 * `npm:` alias, else `depName`. Null when the spec is no registry spec.
 */
export function edgeTargetName(depName: string, spec: string): string | null {
  try {
    const parsed = npa.resolve(depName, spec);
    if (parsed.type === 'alias') return parsed.subSpec.name ?? null;
    return parsed.name ?? null;
  } catch {
    return null;
  }
}

/** True when an edge spec names one exact version (an alias's target too). */
export function isExactSpec(depName: string, spec: string): boolean {
  try {
    const parsed = npa.resolve(depName, spec);
    if (parsed.type === 'alias') return parsed.subSpec.type === 'version';
    return parsed.type === 'version';
  } catch {
    return false;
  }
}

/**
 * Whether an edge skips the release-age cutoff. Decided on registry names,
 * never on an install path or an alias key: the edge's target is under an
 * exempt prefix, or the edge is an exact version declared by a parent whose
 * own registry name is under one. A package exempt only by such a pin passes
 * nothing on: its registry name is not under the prefix.
 */
export function edgeIsExempt(
  edge: { name: string; spec: string; parentName?: string },
  exempt: readonly string[],
): boolean {
  const target = edgeTargetName(edge.name, edge.spec);
  if (target === null) return false;
  if (isExemptName(target, exempt)) return true;
  return (
    edge.parentName !== undefined &&
    isExemptName(edge.parentName, exempt) &&
    isExactSpec(edge.name, edge.spec)
  );
}

/** The tarball path npm serves for `name@version` under a registry path. */
function tarballPath(registryPath: string, name: string, version: string) {
  const base = name.startsWith('@') ? name.slice(name.indexOf('/') + 1) : name;
  return `${registryPath}${name}/-/${base}-${version}.tgz`;
}

const LAYOUT =
  /^node_modules\/((?:@[^/]+\/)?[^/@][^/]*)(?:\/node_modules\/((?:@[^/]+\/)?[^/@][^/]*))?$/;

/** The install names of a path in one of the two layouts, or null. */
export function parseInstallPath(
  path: string,
): { name: string; consumer?: string } | null {
  const match = LAYOUT.exec(path);
  if (!match) return null;
  const [, first, second] = match;
  if (!isPackageName(first)) return null;
  if (second === undefined) return { name: first };
  if (!isPackageName(second)) return null;
  return { name: second, consumer: first };
}

/** Where Node finds `dep` from a package at `path`, in tree layout order. */
export function lookupPaths(path: string, dep: string): string[] {
  const at = parseInstallPath(path);
  if (!at) return [];
  return at.consumer === undefined
    ? [`node_modules/${at.name}/node_modules/${dep}`, `node_modules/${dep}`]
    : [
        `node_modules/${at.consumer}/node_modules/${dep}`,
        `node_modules/${dep}`,
      ];
}

export interface PackageTreeCheckOptions {
  /** The registry this build installs from (the tree must name it). */
  registry: string;
  /** Registries for scopes (`@scope` to URL); others use `registry`. */
  scopeRegistries?: Record<string, string>;
  /**
   * Packages the build installs directly, name to spec: each must sit at
   * `node_modules/<name>` with a version the spec names.
   */
  declared?: Record<string, string>;
  /**
   * Name prefixes a cooldown exempts. An alias whose install name and
   * registry name fall on different sides of one is refused.
   */
  exempt?: readonly string[];
}

/**
 * Every reason a value is not a tree this build may install; empty when it
 * is one. Checked without any network: the shape, the registry, every entry's
 * tarball URL, sha512 integrity and exact version, the two layouts, aliases
 * that do not cross an exempt prefix, the declared roots and that every edge
 * has a target.
 */
export function packageTreeProblems(
  value: unknown,
  options: PackageTreeCheckOptions,
): string[] {
  const parsed = PackageTreeSchema.safeParse(value);
  if (!parsed.success) {
    return parsed.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
  }
  const tree = parsed.data;
  const problems: string[] = [];
  const exempt = options.exempt ?? [];
  const registry = normalizeRegistry(options.registry);
  const treeRegistry = normalizeRegistry(tree.registry);
  if (!registry)
    return [`the build registry is not a URL: ${options.registry}`];
  if (!treeRegistry || treeRegistry.href !== registry.href) {
    problems.push(`registry ${tree.registry} is not ${registry.href}`);
  }

  const paths = Object.keys(tree.packages);
  if (paths.length > PACKAGE_TREE_MAX_ENTRIES) {
    return [
      `${paths.length} entries, more than ${PACKAGE_TREE_MAX_ENTRIES}`,
      ...problems,
    ];
  }

  for (const [path, entry] of Object.entries(tree.packages)) {
    const at = parseInstallPath(path);
    if (!at) {
      problems.push(
        `${path}: not node_modules/<name> or node_modules/<name>/node_modules/<name>`,
      );
      continue;
    }
    if (!isPackageName(entry.name)) {
      problems.push(`${path}: name ${entry.name} is not a package name`);
      continue;
    }
    if (aliasCrossesExemption(at.name, entry.name, exempt)) {
      problems.push(
        `${path}: an alias of ${entry.name} crosses an exempt prefix`,
      );
    }
    if (semver.valid(entry.version) !== entry.version) {
      problems.push(`${path}: version ${entry.version} is not exact`);
    }
    if (!SHA512_INTEGRITY.test(entry.integrity)) {
      problems.push(`${path}: integrity is not one sha512 value`);
    }
    const scoped = options.scopeRegistries?.[scopeOf(entry.name)];
    const from = scoped ? normalizeRegistry(scoped) : registry;
    if (!tarballOn(entry.resolved, from, entry.name, entry.version)) {
      problems.push(
        `${path}: resolved ${entry.resolved} is not the ${entry.name}@${entry.version} tarball on ${from?.origin ?? 'the registry'}`,
      );
    }
    for (const [dep, spec] of Object.entries(entry.dependencies ?? {})) {
      const target = edgeTargetName(dep, spec);
      if (target === null) {
        problems.push(`${path}: dependency ${dep}@${spec} is no registry spec`);
        continue;
      }
      if (aliasCrossesExemption(dep, target, exempt)) {
        problems.push(
          `${path}: dependency ${dep}@${spec} crosses an exempt prefix`,
        );
        continue;
      }
      const found = lookupPaths(path, dep).find((p) => tree.packages[p]);
      if (!found || tree.packages[found].name !== target) {
        problems.push(
          `${path}: dependency ${dep}@${spec} has no ${target} in the tree`,
        );
      }
    }
  }

  for (const [name, spec] of Object.entries(options.declared ?? {})) {
    const root = tree.packages[`node_modules/${name}`];
    if (!root || root.name !== name) {
      problems.push(`declared ${name}@${spec} is not at node_modules/${name}`);
    } else if (!versionNamedBy(root.version, spec)) {
      problems.push(`declared ${name}@${spec} is ${root.version} in the tree`);
    }
  }
  return problems;
}

/** `packageTreeProblems`, throwing `PackageTreeError`; returns the tree. */
export function assertPackageTree(
  value: unknown,
  options: PackageTreeCheckOptions,
): PackageTree {
  const problems = packageTreeProblems(value, options);
  if (problems.length > 0) throw new PackageTreeError(problems);
  return PackageTreeSchema.parse(value);
}

function tarballOn(
  resolved: string,
  registry: URL | null,
  name: string,
  version: string,
): boolean {
  if (!registry) return false;
  let url: URL;
  try {
    url = new URL(resolved);
  } catch {
    return false;
  }
  return (
    url.origin === registry.origin &&
    url.protocol === registry.protocol &&
    url.username === '' &&
    url.password === '' &&
    url.search === '' &&
    url.hash === '' &&
    url.pathname === tarballPath(registry.pathname, name, version)
  );
}

/** An exact spec names that version; a range admits it; a tag names any. */
function versionNamedBy(version: string, spec: string): boolean {
  if (semver.valid(spec) !== null) return semver.eq(spec, version);
  if (semver.validRange(spec) !== null) {
    return semver.satisfies(version, spec, { includePrerelease: true });
  }
  return true;
}

/** The root entries as sorted `name@version` lines. */
export function treeVersionLines(tree: PackageTree): string[] {
  return Object.entries(tree.packages)
    .flatMap(([path, entry]) => {
      const at = parseInstallPath(path);
      return at && at.consumer === undefined
        ? [`${at.name}@${entry.version}`]
        : [];
    })
    .sort((a, b) => a.localeCompare(b));
}

/**
 * The edges a package's own manifest makes the bundler follow: every
 * dependency and every peer not marked optional.
 */
export function followedEdges(manifest: {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}): Record<string, string> {
  const edges: Record<string, string> = { ...(manifest.dependencies ?? {}) };
  for (const [name, spec] of Object.entries(manifest.peerDependencies ?? {})) {
    if (manifest.peerDependenciesMeta?.[name]?.optional === true) continue;
    if (!(name in edges)) edges[name] = spec;
  }
  return edges;
}
