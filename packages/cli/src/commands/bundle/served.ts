/**
 * The web flows a server flow serves (`config.bundle.flows`), built into the
 * server's output: the write check, the builds into scratch and the
 * placement at each listed path.
 */

import path from 'path';
import fs from 'fs-extra';
import {
  firstPathPartIs,
  servedFlowPath,
  type Logger,
  type ServedFlow,
} from '@walkeros/core';
import type { ValidationError } from '@walkeros/core/dev';
import { loadBundleConfig, type LoadConfigResult } from '../../config/index.js';
import { getErrorMessage } from '../../core/index.js';
import type { PackageInstall } from '../../core/package-tree.js';
import { isArchiveOutput } from './archive.js';
import { bundleCore, includeApplies } from './bundler.js';
import { resolveTarget } from './targets.js';

/** What a served build takes from the call that builds its server flow. */
export interface ServedBuildContext {
  rawConfig: unknown;
  configPath: string;
  buildEnv?: Record<string, string | undefined>;
  cache?: boolean;
  /**
   * The call's install root (`buildOverrides.tempDir`): each served build
   * installs in a folder of its own inside it. Absent, a per-run temp folder.
   */
  tempDir?: string;
  logger: Logger.Instance;
  /** How each served web flow installs its packages; absent, it resolves fresh. */
  packageInstall?: (flow: string) => PackageInstall | undefined;
}

export interface BuiltServedFlow extends ServedFlow {
  /** The built file in the scratch folder. */
  file: string;
}

/**
 * A page loads a served file with a script tag, so it is a finished bundle
 * whatever target the server flow builds for.
 */
const SERVED_TARGET = resolveTarget('cdn');

/**
 * The build's own write check: a served path the server bundle's file or an
 * include copy takes. Computed from the output file's name and the include
 * sources before anything builds, so a file an earlier build left in the
 * output folder is no collision. Resolves with errors in the preflight's
 * shape.
 */
export async function servedWriteErrors(
  loaded: LoadConfigResult,
): Promise<ValidationError[]> {
  const { flowName, served, buildOptions } = loaded;
  // An archive's server file is always flow.mjs inside it, which the
  // preflight's archive-entry check already covers.
  const serverFile = isArchiveOutput(buildOptions.output)
    ? undefined
    : path.basename(buildOptions.output);
  const includes = includeApplies(buildOptions)
    ? (buildOptions.include ?? [])
    : [];
  const sourceDir = buildOptions.configDir || process.cwd();

  const errors: ValidationError[] = [];
  for (const { flow, path: servedPath } of served) {
    const rest = servedPath.split('/').slice(1);
    const conflict = (message: string): void => {
      errors.push({
        path: servedFlowPath(flowName, flow),
        code: 'SERVED_PATH_CONFLICT',
        message,
        value: servedPath,
      });
    };

    if (serverFile !== undefined && firstPathPartIs(servedPath, serverFile)) {
      conflict(
        `"${servedPath}" collides with "${serverFile}", the server bundle's file`,
      );
      continue;
    }
    // copyIncludes copies each include to <output folder>/<basename>.
    for (const include of includes) {
      if (!firstPathPartIs(servedPath, path.basename(include))) continue;
      if (
        rest.length === 0 ||
        (await fs.pathExists(path.resolve(sourceDir, include, ...rest)))
      ) {
        conflict(
          `"${servedPath}" collides with a file that include "${include}" copies`,
        );
        break;
      }
    }
  }
  return errors;
}

/** The line and cause every served load or build failure rejects with. */
function servedFailure(flow: string, error: unknown): Error {
  return new Error(
    `Served flow ${flow} failed to build: ${getErrorMessage(error)}`,
    { cause: error },
  );
}

/**
 * Loads one listed web flow with the call's buildEnv, set up for its served
 * build: the cdn flags and include []. Rejects with 'Served flow <key> failed
 * to build: <message>', the original error as its cause.
 */
export async function loadServedFlow(
  flow: string,
  context: Pick<ServedBuildContext, 'rawConfig' | 'configPath' | 'buildEnv'>,
): Promise<LoadConfigResult> {
  try {
    return loadBundleConfig(context.rawConfig, {
      configPath: context.configPath,
      flowName: flow,
      buildEnv: context.buildEnv,
      buildOverrides: {
        skipWrapper: SERVED_TARGET.skipWrapper,
        withDev: SERVED_TARGET.withDev,
        externalizeDev: SERVED_TARGET.externalizeDev,
        include: [],
      },
    });
  } catch (error) {
    throw servedFailure(flow, error);
  }
}

/**
 * Loads every served web flow, then builds each one after another into
 * `<scratch>/<index>/<basename(path)>`. Rejects with 'Served flow <key>
 * failed to build: <message>', the original error as its cause.
 */
export async function buildServedFlows(
  served: readonly ServedFlow[],
  context: ServedBuildContext,
  scratch: string,
): Promise<BuiltServedFlow[]> {
  // Every listed flow loads before any builds, so a broken one fails before
  // anything is fetched.
  const loads: Array<{ entry: ServedFlow; loaded: LoadConfigResult }> = [];
  for (const entry of served) {
    loads.push({ entry, loaded: await loadServedFlow(entry.flow, context) });
  }

  const built: BuiltServedFlow[] = [];
  // One after another, so one build's memory never stacks on another's.
  for (const [index, { entry, loaded }] of loads.entries()) {
    const file = path.join(scratch, String(index), path.basename(entry.path));
    const tempDir = context.tempDir
      ? path.join(context.tempDir, `served-${index}`)
      : undefined;
    try {
      await buildServedFlow(entry.flow, loaded, file, tempDir, context);
    } catch (error) {
      throw servedFailure(entry.flow, error);
    }
    built.push({ flow: entry.flow, path: entry.path, file });
  }
  return built;
}

/** Builds one loaded served web flow into `file`. */
async function buildServedFlow(
  flow: string,
  { flowSettings, buildOptions, configDigest }: LoadConfigResult,
  file: string,
  tempDir: string | undefined,
  context: ServedBuildContext,
): Promise<void> {
  buildOptions.output = file;
  if (tempDir) buildOptions.tempDir = tempDir;
  if (context.cache !== undefined) buildOptions.cache = context.cache;
  try {
    const packageInstall = context.packageInstall?.(flow);
    if (packageInstall) buildOptions.packageInstall = packageInstall;
    // No release: a served file carries its own content release, or the
    // collector.release its flow authors.
    await bundleCore(flowSettings, buildOptions, context.logger, false, {
      flowName: flow,
      configDigest,
    });
  } catch (error) {
    // The build's error is the one to report; removing its folder is best
    // effort here.
    if (tempDir) await fs.remove(tempDir).catch(() => {});
    throw error;
  }
  // An install never clears its target, so a root shared with the next build
  // would hand it this build's packages; bundleCore keeps a caller's
  // tempDir, so it is removed here, and a failed removal fails the build.
  if (tempDir) await fs.remove(tempDir);
}

/**
 * Copies each built file to `<dir>/<path>` (parents made), over what an
 * earlier build left there, logs one line per file and resolves with the
 * paths placed.
 */
export async function placeServedFlows(
  built: readonly BuiltServedFlow[],
  dir: string,
  logger: Logger.Instance,
): Promise<string[]> {
  const placed: string[] = [];
  for (const { flow, path: servedPath, file } of built) {
    const target = path.join(dir, ...servedPath.split('/'));
    await fs.ensureDir(path.dirname(target));
    await fs.copyFile(file, target);
    logger.info(`Served flow ${flow}: ${servedPath}`);
    placed.push(servedPath);
  }
  return placed;
}
