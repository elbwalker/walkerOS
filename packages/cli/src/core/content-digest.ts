/**
 * Content digests for build cache keys and the default release id.
 *
 * Every input is content the bundler consumes: the deferred flow settings,
 * the resolved package set (local packages by the bytes of their installed
 * copy) and the CLI version. Environment and secret values are never inputs,
 * only their markers, so a digest leaks none of them.
 */

import { createHash } from 'node:crypto';
import path from 'path';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';

const DIGEST_LENGTH = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** JSON with object keys sorted at every depth. Arrays keep their order. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) => {
    if (!isRecord(inner)) return inner;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(inner).sort()) sorted[key] = inner[key];
    return sorted;
  });
}

/**
 * Hash a flow's deferred settings (its `$env` and `$secret` references are
 * still markers). `collector.release` is left out and `collector.name`
 * defaults to the flow name, so the digest names the config the release is
 * derived from. Declared `config.bundle.env` values are reduced to their keys:
 * they are the values web `$env` references resolve to.
 */
export function configDigest(flowSettings: Flow, flowName: string): string {
  const collector: Record<string, unknown> = {
    ...(flowSettings.collector ?? {}),
  };
  delete collector.release;
  collector.name ??= flowName;

  const config = flowSettings.config;
  const declaredEnv = config?.bundle?.env;
  const hashedConfig =
    config && declaredEnv
      ? {
          ...config,
          bundle: { ...config.bundle, env: Object.keys(declaredEnv).sort() },
        }
      : config;

  return createHash('sha256')
    .update(canonicalJson({ ...flowSettings, config: hashedConfig, collector }))
    .digest('hex');
}

/**
 * Hash an installed package directory: every file by relative path and bytes,
 * a symlink by its target. Paths are sorted, so file system order and mtimes
 * never change the result.
 */
export async function hashInstalledDir(dir: string): Promise<string> {
  const hash = createHash('sha256');
  for (const rel of await listFiles(dir, '')) {
    const abs = path.join(dir, rel);
    const stat = await fs.lstat(abs);
    hash.update(`${rel}\0`);
    hash.update(
      stat.isSymbolicLink() ? await fs.readlink(abs) : await fs.readFile(abs),
    );
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, DIGEST_LENGTH);
}

async function listFiles(root: string, rel: string): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, rel), {
    withFileTypes: true,
  });
  const files: string[] = [];
  for (const entry of entries) {
    const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await listFiles(root, entryRel)));
    else files.push(entryRel);
  }
  return files.sort();
}

export interface ReleaseDigestInput {
  /** {@link configDigest} of the flow. */
  configDigest: string;
  /** Sorted `name@version` lines, a local package as `name@local:<hash>`. */
  versions: string[];
  /** CLI version, since generated code changes with it. */
  toolchain: string;
}

/** Default release id: 12 lowercase hex over config, packages and CLI. */
export function releaseDigest(input: ReleaseDigestInput): string {
  return createHash('sha256')
    .update(
      canonicalJson({
        config: input.configDigest,
        versions: input.versions,
        toolchain: input.toolchain,
      }),
    )
    .digest('hex')
    .slice(0, DIGEST_LENGTH);
}
