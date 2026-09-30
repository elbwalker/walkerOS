import fs from 'fs-extra';
import path from 'path';
import type { Flow } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { bundleCore } from '../../bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { createCLILogger } from '../../../core/cli-logger.js';

/**
 * Bundles a flow against the monorepo's own packages (their built `dist`),
 * so a simulate test runs today's code rather than a registry release. Every
 * declared package and its `@walkeros` dependencies get a local `path`.
 */

const packagesDir = path.resolve(__dirname, '../../../../..');

function readPackageName(dir: string): string | undefined {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) return undefined;
  const pkg: unknown = fs.readJSONSync(file);
  return isObject(pkg) && typeof pkg.name === 'string' ? pkg.name : undefined;
}

function findPackageDirs(
  dir: string,
  depth = 0,
  found = new Map<string, string>(),
): Map<string, string> {
  const name = readPackageName(dir);
  if (name?.startsWith('@walkeros/')) found.set(name, dir);
  if (depth >= 4) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (['node_modules', 'dist', 'src', 'coverage'].includes(entry.name))
      continue;
    if (entry.name.startsWith('.')) continue;
    findPackageDirs(path.join(dir, entry.name), depth + 1, found);
  }
  return found;
}

function injectLocalPaths(flow: Flow, dirs: Map<string, string>): void {
  const packages = flow.config?.bundle?.packages;
  if (!packages) return;
  const add = (name: string): void => {
    const dir = dirs.get(name);
    if (!dir || name === '@walkeros/server-core') return;
    if (packages[name]?.path) return;
    packages[name] = { ...packages[name], path: dir };
    const pkg: unknown = fs.readJSONSync(path.join(dir, 'package.json'));
    const deps =
      isObject(pkg) && isObject(pkg.dependencies) ? pkg.dependencies : {};
    for (const dep of Object.keys(deps))
      if (dep.startsWith('@walkeros/')) add(dep);
  };
  for (const name of Object.keys(packages)) add(name);
}

/**
 * Points the flow's packages at the monorepo (in place) and bundles it as the
 * ESM skeleton the simulate functions import. Returns the bundle path.
 */
export async function bundleLocalFlow(
  config: Flow.Json,
  outputPath: string,
  flowName?: string,
): Promise<string> {
  const dirs = findPackageDirs(packagesDir);
  for (const flow of Object.values(config.flows)) injectLocalPaths(flow, dirs);
  const { flowSettings, buildOptions } = loadBundleConfig(config, {
    configPath: path.join(path.dirname(outputPath), 'flow.json'),
    flowName,
  });
  buildOptions.output = outputPath;
  buildOptions.skipWrapper = true;
  buildOptions.format = 'esm';
  buildOptions.cache = false;
  buildOptions.minify = false;
  await bundleCore(
    flowSettings,
    buildOptions,
    createCLILogger({ silent: true }),
  );
  return outputPath;
}
