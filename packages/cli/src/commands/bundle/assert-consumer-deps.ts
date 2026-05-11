import fs from 'fs-extra';
import * as path from 'path';
import semver from 'semver';
import type { Logger } from '@walkeros/core';

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
}

export interface DepViolation {
  consumerName: string;
  consumerVersion: string;
  depName: string;
  declaredRange: string;
  installedVersion: string;
  installedDir: string;
}

/**
 * Walks every installed package under `<root>/node_modules/**` and reports each
 * case where a declared dependency resolves (via Node-style nearest-ancestor
 * lookup) to a version that does NOT satisfy the declared range.
 *
 * Defense-in-depth observability for the bundler's resolver. Returns the list
 * of violations and emits a `logger.warn` for each. Does NOT throw — many
 * mismatches are benign npm transitives that nft will prune from the shipped
 * bundle. If a runtime error like "X is not a function" surfaces despite the
 * resolver fix, look at these warnings to find the culprit, then add an
 * `overrides` entry in your flow's package.json.
 */
export async function assertConsumerDepsSatisfied(
  root: string,
  logger: Logger.Instance,
): Promise<DepViolation[]> {
  const consumers = await collectInstalledPackages(
    path.join(root, 'node_modules'),
  );
  const violations: DepViolation[] = [];

  for (const consumer of consumers) {
    const pkg = consumer.pkg;
    if (!pkg.dependencies) continue;
    for (const [depName, declaredRange] of Object.entries(pkg.dependencies)) {
      const installed = await resolveSiblingOrAncestor(
        consumer.dir,
        depName,
        root,
      );
      if (!installed) {
        logger.debug(
          `assertConsumerDepsSatisfied: ${pkg.name}@${pkg.version} declares ${depName}@${declaredRange} but it's not installed`,
        );
        continue;
      }
      // git/file:/tag — can't statically verify
      if (
        semver.validRange(declaredRange) === null &&
        semver.valid(declaredRange) === null
      ) {
        logger.debug(
          `assertConsumerDepsSatisfied: skipping non-semver declared range ${depName}@${declaredRange} from ${pkg.name}`,
        );
        continue;
      }
      const satisfied = semver.valid(declaredRange)
        ? declaredRange === installed.version
        : semver.satisfies(installed.version, declaredRange, {
            includePrerelease: true,
          });
      if (!satisfied) {
        const violation: DepViolation = {
          consumerName: pkg.name ?? '<unknown>',
          consumerVersion: pkg.version ?? '<unknown>',
          depName,
          declaredRange,
          installedVersion: installed.version,
          installedDir: installed.dir,
        };
        violations.push(violation);
        logger.warn(
          `Bundler dep mismatch: ${violation.consumerName}@${violation.consumerVersion} declares ${depName}@${declaredRange} but resolved to ${installed.version} at ${installed.dir}. If this surfaces at runtime, add an "overrides" entry to your flow's package.json.`,
        );
      }
    }
  }

  return violations;
}

interface InstalledPackage {
  dir: string;
  pkg: PackageJson;
}

async function collectInstalledPackages(
  nodeModulesDir: string,
): Promise<InstalledPackage[]> {
  const result: InstalledPackage[] = [];
  if (!(await fs.pathExists(nodeModulesDir))) return result;

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      // Scoped package: recurse into @scope dir, treat children as packages
      if (entry.name.startsWith('@')) {
        const scopedEntries = await fs.readdir(full, { withFileTypes: true });
        for (const scoped of scopedEntries) {
          if (!scoped.isDirectory()) continue;
          await collectOne(path.join(full, scoped.name));
        }
        continue;
      }
      await collectOne(full);
    }
  }

  async function collectOne(pkgDir: string) {
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    if (!(await fs.pathExists(pkgJsonPath))) return;
    const pkg = (await fs.readJson(pkgJsonPath)) as PackageJson;
    result.push({ dir: pkgDir, pkg });
    // Recurse into nested node_modules
    const nestedNm = path.join(pkgDir, 'node_modules');
    if (await fs.pathExists(nestedNm)) await walk(nestedNm);
  }

  await walk(nodeModulesDir);
  return result;
}

/**
 * Node-style resolution: search `<consumerDir>/node_modules/<depName>`, then walk
 * up to each ancestor's `node_modules/<depName>` until we find one or hit `root`.
 */
async function resolveSiblingOrAncestor(
  consumerDir: string,
  depName: string,
  root: string,
): Promise<{ dir: string; version: string } | null> {
  let current = consumerDir;
  while (true) {
    const candidate = path.join(current, 'node_modules', depName);
    const pkgJson = path.join(candidate, 'package.json');
    if (await fs.pathExists(pkgJson)) {
      const pkg = (await fs.readJson(pkgJson)) as PackageJson;
      if (pkg.version) return { dir: candidate, version: pkg.version };
    }
    const parent = path.dirname(current);
    if (parent === current || !current.startsWith(root)) return null;
    current = parent;
  }
}
