/**
 * The walkerOS metadata of a step's package, read from the source
 * resolveStepPackage picked: a local path from its walkerOS.json on disk,
 * any other package from the CDN at the pinned version. Every tool that has
 * a flow reads a step's package here, so all of them read the same source
 * the bundle installs.
 *
 * Node built-ins only: this module is reachable from the `dev` and
 * `validate` entries, which a server process loads without the bundler or
 * the package manager.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { WalkerOSPackage } from '@walkeros/core';
import { fetchPackage, isObject, parseWalkerOSJson } from '@walkeros/core';
import type { ResolvedStepPackage } from './step-packages.js';

/** A package's walkerOS.json content, plus the version read (absent for a local package whose package.json names none). */
export type StepPackageInfo = Omit<
  WalkerOSPackage,
  'packageName' | 'version' | 'description'
> & {
  version?: string;
};

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

/**
 * Read the walkerOS metadata of a resolved step package. A local path
 * resolves against `configDir`; without one nothing is read from disk and
 * the read fails. `client` names the calling tool in the CDN request.
 */
export async function readStepPackageInfo(
  resolved: Pick<ResolvedStepPackage, 'packageName' | 'spec'>,
  options: { configDir?: string; client: string },
): Promise<StepPackageInfo> {
  const { packageName, spec } = resolved;
  if (spec.path === undefined)
    return fetchPackage(packageName, {
      ...(spec.version ? { version: spec.version } : {}),
      client: options.client,
    });

  if (options.configDir === undefined)
    throw new Error(
      'it is a local path package and the input is not a file, so there is no directory to read it from',
    );
  const root = path.isAbsolute(spec.path)
    ? spec.path
    : path.resolve(options.configDir, spec.path);
  const file = [
    path.join(root, 'dist', 'walkerOS.json'),
    path.join(root, 'walkerOS.json'),
  ].find((candidate) => fs.existsSync(candidate));
  if (!file) throw new Error(`no walkerOS.json under ${root}`);
  const meta = readJson(file);
  if (!isObject(meta)) throw new Error(`${file} is not a JSON object`);
  const pkgFile = path.join(root, 'package.json');
  const pkg = fs.existsSync(pkgFile) ? readJson(pkgFile) : undefined;
  const version =
    isObject(pkg) && typeof pkg.version === 'string' ? pkg.version : undefined;
  return { ...parseWalkerOSJson(meta), ...(version ? { version } : {}) };
}
