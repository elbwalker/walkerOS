import { nodeFileTrace } from '@vercel/nft';
import type { NodeFileTraceReasons } from '@vercel/nft';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import picomatch from 'picomatch';

export interface TraceOptions {
  entry: string;
  base: string;
  outDir: string;
  /**
   * Extra paths or globs to feed into nft alongside `entry`.
   *
   * Each entry is treated as either a literal path (when it contains no
   * glob meta-characters) or a glob pattern (when it contains `*`, `?`,
   * `[`, or `{`). Both forms are resolved against `base` (the install
   * root pacote populates), not the user's cwd, so the file tracer sees
   * the same tree esbuild used.
   *
   * Globs are expanded by walking the filesystem tree under `base` and
   * matching each relative path with picomatch. Literal entries pass
   * through unchanged.
   */
  extraIncludes?: string[];
}

export type TraceReasons = NodeFileTraceReasons;

export interface TraceResult {
  fileList: string[];
  copied: number;
  reasons: TraceReasons;
}

export async function traceAndCopy(opts: TraceOptions): Promise<TraceResult> {
  try {
    await fs.stat(opts.entry);
  } catch {
    throw new Error(
      `nft-trace: entry file not found at '${opts.entry}'. ` +
        `Check the path or run 'walkeros bundle' from the directory containing your flow.json.`,
    );
  }

  // `opts.base` is authoritative: callers must pass the pacote-populated
  // install root (the same dir esbuild stage 1 used as `absWorkingDir`) so
  // nft and esbuild see the same `node_modules/` tree. We only normalize
  // through realpath to defuse symlink bases on macOS (`/var` -> `/private/var`).
  const realBase = await fs.realpath(opts.base);
  const expandedExtras = await expandTraceIncludes(
    opts.extraIncludes ?? [],
    realBase,
  );
  const entries = [opts.entry, ...expandedExtras];
  // Keep analysis defaults on (emitGlobs, computeFileReferences, evaluatePureExpressions).
  // These are what catch __dirname-loaded .proto files and similar references.
  const { fileList, reasons } = await nodeFileTrace(entries, {
    base: realBase,
  });

  const outDirReal = path.resolve(opts.outDir);
  let copied = 0;

  for (const file of fileList) {
    const reason = reasons.get(file);
    // `reasons.ignored` is a contract with @vercel/nft: when nft marks a file
    // as ignored, we trust it and skip the copy. Our public API does not
    // expose nft's `ignore` option, so this branch is not directly testable
    // from a unit test without contorting the surface. Future reviewers: do
    // not delete this guard. It is the documented integration point.
    if (reason?.ignored) continue;

    const dst = path.resolve(outDirReal, file);
    if (!dst.startsWith(outDirReal + path.sep) && dst !== outDirReal) {
      throw new Error(
        `nft-trace: traced file '${file}' resolves outside outDir. ` +
          `This usually means base is too narrow for a hoisted monorepo. ` +
          `Move base up to the workspace root or set traceInclude explicitly.`,
      );
    }

    const src = path.join(realBase, file);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
    const s = await fs.stat(src);
    if (s.mode & 0o111) await fs.chmod(dst, s.mode);
    copied++;
  }

  return { fileList: Array.from(fileList), copied, reasons };
}

/**
 * Cross-check helper: after tracing, verify every package pacote resolved
 * (the top-level set) was actually picked up by the trace.
 *
 * Catches three concrete failure modes that nft cannot diagnose itself:
 * - Hoisted monorepo symlinks where the real package lives outside `base`,
 *   so nft never sees it.
 * - Per-release nft regressions that drop a previously-traced package.
 * - Deps imported only via dynamic `require` strings nft cannot statically
 *   resolve (and therefore cannot include).
 *
 * The expected set comes from pacote's resolution (the install layer), not
 * from the user's `package.json` (which does not list step packages in the
 * zero-setup design). The check is shallow on purpose: we only verify the
 * package's `package.json` reached the trace, not every file inside. If the
 * manifest is there, nft followed the imports and copied what it found; if
 * a deeper file is missing the user adds it via
 * `flow.<name>.config.bundle.traceInclude`.
 */
export interface AssertDepsOptions {
  fileList: string[];
  expectedPackages: string[];
}

export function assertDepsTraced(opts: AssertDepsOptions): void {
  const missing = opts.expectedPackages.filter((dep) => {
    const expected = `node_modules/${dep}/package.json`;
    return !opts.fileList.some((f) => f.endsWith(expected));
  });
  if (missing.length > 0) {
    throw new Error(
      `nft-trace: resolved packages missing from trace: ${missing.join(', ')}. ` +
        `Possible causes: hoisted monorepo symlinks outside base; nft per-release regression; ` +
        `dynamic require not statically traceable. ` +
        `Add specific paths to flow.<name>.config.bundle.traceInclude as a workaround.`,
    );
  }
}

/**
 * Glob meta-characters that signal a trace-include entry needs filesystem
 * walk + picomatch expansion. Mirrors picomatch's own definition; kept
 * local so future tweaks (e.g., adding `(`) don't reach into picomatch.
 */
const GLOB_CHARS = /[*?[\]{}]/;

/**
 * Resolve user-provided trace includes
 * (`flow.<name>.config.bundle.traceInclude`) into a list of absolute file
 * paths the file tracer can consume.
 *
 * Each entry is one of:
 * - A literal path: returned as an absolute path resolved against `base`.
 *   Missing files are tolerated (nft surfaces its own clearer error).
 * - A glob pattern (contains `*`, `?`, `[`, `{`): expanded by walking
 *   `base` and matching each relative path with picomatch. Only files
 *   are returned (directories are walked through, never matched).
 *
 * `base` is the install root (the same dir esbuild stage 1 used as
 * `absWorkingDir`), NOT `process.cwd()`. This keeps glob expansion in
 * the same tree nft will trace, avoiding a class of "the glob matches
 * nothing because the user's cwd is wrong" surprises.
 */
async function expandTraceIncludes(
  patterns: string[],
  base: string,
): Promise<string[]> {
  if (patterns.length === 0) return [];

  const literals: string[] = [];
  const globs: string[] = [];
  for (const entry of patterns) {
    if (GLOB_CHARS.test(entry)) globs.push(entry);
    else literals.push(entry);
  }

  const resolvedLiterals = literals.map((p) =>
    path.isAbsolute(p) ? p : path.resolve(base, p),
  );

  if (globs.length === 0) return resolvedLiterals;

  const matchers = globs.map((g) => picomatch(g));
  const matchedFiles: string[] = [];
  await walkFiles(base, base, async (absFile, relFile) => {
    // Globs match POSIX-style paths even on Windows; normalize before
    // testing so user-authored patterns stay portable.
    const relPosix = relFile.split(path.sep).join('/');
    if (matchers.some((m) => m(relPosix))) {
      matchedFiles.push(absFile);
    }
  });

  return [...resolvedLiterals, ...matchedFiles];
}

/**
 * Recursively walk `dir`, calling `visit(absPath, relativeToRoot)` for
 * every regular file encountered. Symlinks are followed for directories
 * via `withFileTypes` (the default `Dirent.isDirectory()` resolves the
 * link). We don't apply ignores here; trace includes are an explicit
 * user opt-in and the patterns themselves are expected to scope.
 */
async function walkFiles(
  root: string,
  dir: string,
  visit: (absFile: string, relFile: string) => Promise<void>,
): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(root, abs, visit);
    } else if (entry.isFile()) {
      await visit(abs, path.relative(root, abs));
    }
  }
}
