import crypto from 'crypto';
import esbuild from 'esbuild';
import { builtinModules } from 'module';
import path from 'path';
import fs from 'fs-extra';
import type { Flow, ObserveWeb, PreviewKey, Transformer } from '@walkeros/core';
import {
  packageNameToVariable,
  ENV_MARKER_PREFIX,
  SECRET_MARKER_PREFIX,
  isPathStepEntry,
  isObject,
} from '@walkeros/core';
import {
  classifyStepProperties,
  containsCodeMarkers,
} from './config-classifier.js';
import {
  validateComponentNames,
  validateReference,
  validateStoreReferences,
} from './structural-validators.js';

// Re-export the structural validators so existing import sites (and the public
// package entry) keep resolving them from `./bundler`. The implementations live
// in `./structural-validators` so they can run without loading esbuild.
export {
  validateComponentNames,
  validateReference,
  validateStoreReferences,
} from './structural-validators.js';

/**
 * Type guard to check if a code value is an InlineCode object.
 * InlineCode has { push: string, type?: string, init?: string }
 */
function isInlineCode(code: unknown): code is Flow.Code {
  return (
    code !== null &&
    typeof code === 'object' &&
    !Array.isArray(code) &&
    'push' in code
  );
}

/**
 * Type-narrowed accessor for a Flow section. Returns the typed step record
 * (or undefined) — exhaustive switch over the literal-union parameter avoids
 * a generic indexed-access cast.
 *
 * Returns the union of all section types when the caller passes a runtime
 * variable. Call sites that need a specific section type access the field
 * directly (e.g. `flow.sources`).
 */
type FlowStepRecord =
  | Record<string, Flow.Source>
  | Record<string, Flow.Destination>
  | Record<string, Flow.Transformer>
  | Record<string, Flow.Store>;
function getFlowSection(
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
 * A reference carries inline code when it is an InlineCode object or (legacy)
 * a string. Used by the codegen step-filtering below.
 */
function hasCodeReference(code: unknown): boolean {
  return isInlineCode(code) || typeof code === 'string';
}

/**
 * Generates inline code for any component type (source, destination, transformer).
 * Handles $code: prefix for push/init functions.
 *
 * @param inline - InlineCode object with push, optional init, optional type
 * @param config - Component configuration
 * @param env - Optional environment configuration
 * @param chains - Optional chain values: `before` (post-collector for destinations,
 *   pre-push for transformers, pre-source for sources) and `next`
 *   (pre-collector for sources/transformers, post-push for destinations).
 * @param isDestination - Whether this is a destination (uses different code structure)
 */
function generateInlineCode(
  inline: Flow.Code,
  config: object,
  env?: object,
  chains?: { before?: Transformer.Route; next?: Transformer.Route },
  isDestination?: boolean,
): string {
  const pushFn = inline.push.replace('$code:', '');
  const initFn = inline.init ? inline.init.replace('$code:', '') : undefined;
  const typeLine = inline.type ? `type: '${inline.type}',` : '';

  const chainLines: string[] = [];
  if (chains?.before !== undefined) {
    chainLines.push(`before: ${JSON.stringify(chains.before)}`);
  }
  if (chains?.next !== undefined) {
    chainLines.push(`next: ${JSON.stringify(chains.next)}`);
  }
  const chainBlock = chainLines.length
    ? `,\n      ${chainLines.join(',\n      ')}`
    : '';

  // Destinations have a different structure - code is the instance directly
  if (isDestination) {
    return `{
      code: {
        ${typeLine}
        config: ${processConfigValue(config || {})},
        ${initFn ? `init: ${initFn},` : ''}
        push: ${pushFn}
      },
      config: ${processConfigValue(config || {})},
      env: ${processConfigValue(env || {})}${chainBlock}
    }`;
  }

  // Sources and transformers use factory pattern
  return `{
      code: async (context) => ({
        ${typeLine}
        config: context.config,
        ${initFn ? `init: ${initFn},` : ''}
        push: ${pushFn}
      }),
      config: ${processConfigValue(config || {})},
      env: ${processConfigValue(env || {})}${chainBlock}
    }`;
}
import type { BuildOptions } from '../../types/bundle.js';
import {
  downloadPackagesWithResolution,
  loadNpmConfigForPacote,
} from './package-manager.js';
import { traceAndCopy, assertDepsTraced } from './nft-trace.js';
import { assertConsumerDepsSatisfied } from './assert-consumer-deps.js';
import type { Logger } from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';
import { getTmpPath } from '../../core/tmp.js';
import { toFileImportSpecifier } from '../../core/import-specifier.js';
import {
  isBuildCached,
  getCachedBuild,
  cacheBuild,
  getCachedCode,
  cacheCode,
  ensureCodeOnDisk,
} from '../../core/build-cache.js';
import type { CodeCacheKeyInputs } from '../../core/build-cache.js';

export interface BundleStats {
  totalSize: number;
  packages: { name: string }[];
  buildTime: number;
  treeshakingEffective: boolean;
}

/**
 * Copy included folders to output directory.
 * Used to make credential files and other assets available alongside the bundle.
 */
export async function copyIncludes(
  includes: string[],
  sourceDir: string,
  outputDir: string,
  logger: Logger.Instance,
): Promise<void> {
  for (const include of includes) {
    const sourcePath = path.resolve(sourceDir, include);
    const folderName = path.basename(include);
    const destPath = path.join(outputDir, folderName);

    // Detect circular copies: source contains output or output contains source
    const resolvedOutput = path.resolve(outputDir);
    const resolvedSource = path.resolve(sourcePath);
    if (
      resolvedSource === resolvedOutput ||
      resolvedOutput.startsWith(resolvedSource + path.sep) ||
      resolvedSource.startsWith(resolvedOutput + path.sep)
    ) {
      throw new Error(
        `Circular include detected: "${include}" resolves to "${resolvedSource}" which overlaps with output directory "${resolvedOutput}"`,
      );
    }

    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, destPath);
      logger.debug(`Copied ${include} to output`);
    } else {
      logger.warn(`Include folder not found: ${include}`);
    }
  }
}

/**
 * Generate cache key content from flow config and build options.
 * Excludes non-deterministic fields (tempDir, output) from cache key.
 *
 * Hashes pacote's resolved top-level set as the dependency-version signal:
 * a version bump in `flow.<name>.config.bundle.packages` (or any transitive re-resolution
 * pacote performs) produces a new `versionsHash`, which produces a new
 * cache key, which produces a new traced `node_modules/`. The user does
 * NOT maintain a `package-lock.json` for step packages in the zero-setup
 * design, so pacote's resolution is the authoritative version signal.
 */
function generateCacheKeyContent(
  flowSettings: Flow,
  buildOptions: BuildOptions,
  versionsHash: string,
): string {
  const configForCache = {
    flow: flowSettings,
    build: {
      ...buildOptions,
      // Exclude non-deterministic fields from cache key
      tempDir: undefined,
      output: undefined,
    },
    // The format the served artifact is emitted in, derived from `platform`
    // (browser=iife, node=esm) rather than the declared `buildOptions.format`.
    // Including it in the key one-time-invalidates any cache entry written by an
    // older CLI that emitted ESM for a browser build, so a stale ESM artifact is
    // never served. It does NOT detect a runtime divergence: because it is
    // re-derived from `platform`, removing the `format:'iife'` line below would
    // not change this key. The durable cross-version cache bust is the
    // version/toolchain hash, not this field.
    emittedFormat: resolveEmittedFormat(buildOptions),
    versionsHash,
  };
  return JSON.stringify(configForCache);
}

/**
 * The format the served (stage-2 / wrap) artifact is emitted in, derived from
 * platform. Browser artifacts are IIFE-wrapped so internal declarations stay
 * private; node/server artifacts stay ESM (they rely on a `createRequire`
 * banner and bare ESM imports). Stage-1 skeletons are always ESM and are not
 * served, so they are not represented here.
 */
function resolveEmittedFormat(buildOptions: BuildOptions): 'iife' | 'esm' {
  return buildOptions.platform === 'browser' ? 'iife' : 'esm';
}

export async function bundleCore(
  flowSettings: Flow,
  buildOptions: BuildOptions,
  logger: Logger.Instance,
  showStats = false,
): Promise<BundleStats | void> {
  const bundleStartTime = Date.now();

  // Per-build isolation: unique working dir, shared cache
  const buildId = crypto.randomUUID();
  const TEMP_DIR =
    buildOptions.tempDir || getTmpPath(undefined, `walkeros-build-${buildId}`);
  const CACHE_DIR = buildOptions.tempDir || getTmpPath();

  // Resolve npm config (registry + scope overrides + auth tokens) from .npmrc
  // once per build. Threaded into every pacote call so private registries and
  // scoped tokens (e.g. @elbwalker:registry=...) work the same as `npm install`.
  const npmConfig = await loadNpmConfigForPacote(
    buildOptions.configDir ?? process.cwd(),
  );

  // Resolve the deploy artifact directory once so stale-artifact cleanup,
  // sidecar emission, and the install pipeline all agree on which folder
  // hosts `flow.mjs` + `node_modules/` + `package.json` + `package-lock.json`.
  const outputPath = path.resolve(buildOptions.output);
  const outputDirAbs = path.dirname(outputPath);

  // Stale cleanup: a previous build with externals can leave behind
  // node_modules/, package.json, and package-lock.json that no longer match
  // the current flow. We unconditionally purge them at the top so a flow
  // that USED to declare externals but no longer does cannot ship stale
  // install artifacts. Runs before any cache check so it applies on cache
  // hits too.
  await fs.remove(path.join(outputDirAbs, 'node_modules'));
  await fs.remove(path.join(outputDirAbs, 'package.json'));
  await fs.remove(path.join(outputDirAbs, 'package-lock.json'));

  try {
    // Step 1: Ensure temporary directory exists
    await fs.ensureDir(TEMP_DIR);

    // Step 1.5: Auto-add collector if sources/destinations exist but collector not specified
    const hasSourcesOrDests =
      Object.keys(flowSettings.sources || {}).length > 0 ||
      Object.keys(flowSettings.destinations || {}).length > 0;

    if (hasSourcesOrDests && !buildOptions.packages['@walkeros/collector']) {
      buildOptions.packages['@walkeros/collector'] = {};
    }

    // Step 1.6: Auto-add step packages (sources, destinations, transformers, stores)
    applyStepPackages(flowSettings, buildOptions.packages, logger);

    // Step 2: Download packages
    logger.debug('Downloading packages');
    // Convert packages object to array format expected by downloadPackages
    const packagesArray = Object.entries(buildOptions.packages).map(
      ([name, packageConfig]) => ({
        name,
        version: packageConfig.version || 'latest',
        path: packageConfig.path, // Pass local path if defined
      }),
    );
    // downloadPackagesWithResolution adds 'node_modules' subdirectory
    // automatically and returns the underlying ResolutionResult so the
    // install pipeline can pin extracted versions to the same graph the
    // bundler resolved (no second resolve, no version drift).
    const { packagePaths, resolution: resolutionResult } =
      await downloadPackagesWithResolution(
        packagesArray,
        TEMP_DIR,
        logger,
        buildOptions.cache,
        buildOptions.configDir, // For resolving relative local paths
        CACHE_DIR,
        buildOptions.overrides,
        npmConfig,
      );

    // Fix @walkeros packages to have proper ESM exports and scan every
    // resolved package's manifest for the legacy `walkerOS.bundle` field.
    // The annotation is silently ignored in @walkeros/cli@4.x (nft tracing
    // replaces it). One-time WARN per package nudges authors to clean up.
    const warnedBundleFieldPackages = new Set<string>();
    for (const [pkgName, pkgPath] of packagePaths.entries()) {
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      let pkgJson: Record<string, unknown>;
      try {
        pkgJson = await fs.readJSON(pkgJsonPath);
      } catch {
        continue;
      }

      const walkerOSBlock = pkgJson.walkerOS;
      if (
        walkerOSBlock &&
        typeof walkerOSBlock === 'object' &&
        !Array.isArray(walkerOSBlock)
      ) {
        const bundleField = (walkerOSBlock as Record<string, unknown>).bundle;
        if (
          bundleField &&
          typeof bundleField === 'object' &&
          !Array.isArray(bundleField) &&
          !warnedBundleFieldPackages.has(pkgName)
        ) {
          warnedBundleFieldPackages.add(pkgName);
          const keys = Object.keys(bundleField as Record<string, unknown>)
            .sort()
            .join(', ');
          logger.warn(
            `walkeros: package ${pkgName} still declares walkerOS.bundle.${keys}; this is ignored in @walkeros/cli@4.x. Tell the package author to remove it.`,
          );
        }
      }

      if (pkgName.startsWith('@walkeros/')) {
        // Add exports field to force ESM resolution
        const exportsField = pkgJson.exports;
        const moduleField = pkgJson.module;
        if (!exportsField && typeof moduleField === 'string') {
          pkgJson.exports = {
            '.': {
              import: moduleField,
              require: pkgJson.main,
            },
          };
          await fs.writeJSON(pkgJsonPath, pkgJson, { spaces: 2 });
        }
      }
    }

    // Defense-in-depth: walk every installed package and assert that each
    // declared dependency resolves (Node-style nearest-ancestor lookup) to a
    // satisfying version. Catches resolver bugs, future regressions, and
    // unforeseen hoisting issues before esbuild/nft pick up wrong code.
    if (process.env.BUNDLER_STRICT_RANGES !== '0') {
      await assertConsumerDepsSatisfied(TEMP_DIR, logger);
    }

    // Hash pacote's resolved top-level set once per build. Used in both the
    // L1 cache-key check below and the L2 code-cache key further down. A
    // version bump in `flow.<name>.config.bundle.packages` (or any pacote re-resolution)
    // produces a new hash, which produces a new cache key, which forces a
    // fresh trace + esbuild. This is the right invalidation signal because
    // pacote (not the user's package-lock.json) is the install layer.
    const sortedVersions = [...resolutionResult.topLevel.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, p]) => `${name}@${p.version}`);
    const versionsHash = await getHashServer(sortedVersions.join('\n'), 12);
    // Step packages externalized by esbuild and asserted by nft trace. Use
    // the packages the user (or auto-add) actually declared, not pacote's
    // full top-level set: peer dependencies pacote installs (e.g. zod for
    // schema validation) are not necessarily imported by the runtime
    // bundle. Tree-shaking drops the bare import, nft never sees it, and
    // the cross-check would otherwise false-positive. The intent that
    // matters here is "what step packages does the flow declare".
    const expectedTopLevelPackages = Object.keys(buildOptions.packages).filter(
      (name) => !name.startsWith('.') && !name.startsWith('/'),
    );

    // Check build cache (Level 1 fast path) — moved after package resolution
    // so the cache key reflects the resolved dependency graph (versionsHash).
    if (buildOptions.cache !== false) {
      const configContent = generateCacheKeyContent(
        flowSettings,
        buildOptions,
        versionsHash,
      );

      const cached = await isBuildCached(configContent, CACHE_DIR);
      if (cached) {
        const cachedBuild = await getCachedBuild(configContent, CACHE_DIR);
        if (cachedBuild) {
          logger.debug('Using cached build');

          await fs.ensureDir(path.dirname(outputPath));
          await fs.writeFile(outputPath, cachedBuild);

          if (buildOptions.platform === 'node') {
            // Server path: trace from the cached bundle, copy files into
            // `outDir/node_modules/`, write the informational sidecar.
            await runNftServerPath(
              outputPath,
              flowSettings,
              buildOptions,
              TEMP_DIR,
              expectedTopLevelPackages,
              logger,
            );
          }
          // Web flows don't ship a sidecar node_modules — esbuild emits a
          // self-contained IIFE.

          const stats = await fs.stat(outputPath);
          const sizeKB = (stats.size / 1024).toFixed(1);
          logger.info(`Output: ${outputPath} (${sizeKB} KB, cached)`);

          if (showStats) {
            const packageStats = Object.entries(buildOptions.packages).map(
              ([name, pkg]) => ({
                name: `${name}@${pkg.version || 'latest'}`,
              }),
            );
            const hasWildcardImports = /import\s+\*\s+as\s+\w+\s+from/.test(
              buildOptions.code || '',
            );
            return {
              totalSize: stats.size,
              packages: packageStats,
              buildTime: Date.now() - bundleStartTime,
              treeshakingEffective: !hasWildcardImports,
            };
          }
          return;
        }
      }
    }

    // Step 3: Create package.json to enable ESM in temp directory
    // This ensures Node treats all .js files as ESM and resolves @walkeros packages correctly
    const packageJsonPath = path.join(TEMP_DIR, 'package.json');
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify({ type: 'module' }, null, 2),
    );

    // Step 4: Create split entry point (code skeleton + data payload)
    logger.debug('Creating entry point');
    const { codeEntry, dataPayload, hasFlow, devPackages } =
      await createEntryPoint(flowSettings, buildOptions, packagePaths, logger);

    // outputPath was resolved at the top of bundleCore (alongside the stale
    // cleanup paths). Just ensure its directory exists.
    await fs.ensureDir(path.dirname(outputPath));

    // === LEVEL 2: Two-phase build (code cache) ===
    // Build the L2 cache key inputs once. This must include every input that
    // affects stage-1 output, otherwise different builds with identical entry
    // code (but e.g. different platform) would alias to the same cache slot
    // and stage-2 would receive stale stage-1 bytes.
    //
    // `versionsHash` was hoisted above the L1 cache check (it is also the
    // dependency-version signal in `generateCacheKeyContent`). Reuse it here
    // so a transitive version bump busts both cache layers consistently.
    const codeKeyInputs: CodeCacheKeyInputs = {
      // Deploy browser skeletons (externalizeDev) externalize each `<pkg>/dev`
      // so the lazy registry is not inlined; in-process simulate/push inline it.
      // Record the externals only when they are actually emitted, otherwise two
      // builds with identical entry code but different inline/external `/dev`
      // would alias the same L2 slot and one would receive the other's bytes.
      externals: new Set(
        buildOptions.platform === 'browser' &&
          buildOptions.externalizeDev === true
          ? devPackages.map((p) => `${p}/dev`)
          : [],
      ),
      platform: buildOptions.platform === 'node' ? 'node' : 'browser',
      target: resolveTarget(buildOptions),
      nodeMajor: parseInt(process.versions.node.split('.')[0], 10),
      format: buildOptions.format,
      minify: buildOptions.minify,
      minifyOptions: buildOptions.minifyOptions,
      windowCollector: buildOptions.windowCollector,
      // Retained but inert (deprecation surface): no codegen reads it anymore.
      // Keeping it here only over-keys the code cache, which is harmless.
      windowElb: buildOptions.windowElb,
      versionsHash,
    };

    // Check if we have a cached compilation of this exact code entry
    let compiledCode: string | null = null;
    if (buildOptions.cache !== false) {
      compiledCode = await getCachedCode(codeEntry, CACHE_DIR, codeKeyInputs);
    }

    if (compiledCode) {
      logger.debug('Using cached compiled code (config-only change)');
    } else {
      // Cache miss: run esbuild on code-only entry
      logger.debug(
        `Running esbuild (target: ${buildOptions.target || 'es2018'}, format: ${buildOptions.format})`,
      );
      const entryPath = path.join(TEMP_DIR, 'entry.js');
      await fs.writeFile(entryPath, codeEntry);

      // minify: false — keep identifiers readable for debugging.
      // Stage 2 esbuild (in generateServerEntry/generateWebEntry) handles
      // final bundling with proper import resolution, so minification here
      // is unnecessary.
      const esbuildOptions = createEsbuildOptions(
        { ...buildOptions, minify: false },
        entryPath,
        outputPath,
        TEMP_DIR,
        packagePaths,
        logger,
        expectedTopLevelPackages,
        devPackages,
      );

      try {
        await esbuild.build(esbuildOptions);
      } catch (buildError) {
        // Enhanced error handling for build failures
        throw createBuildError(
          buildError as EsbuildError,
          buildOptions.code || '',
        );
      } finally {
        // Clean up esbuild worker threads to allow process to exit
        await esbuild.stop();
      }

      compiledCode = await fs.readFile(outputPath, 'utf-8');

      // Cache the compiled code for future builds
      if (buildOptions.cache !== false) {
        await cacheCode(codeEntry, compiledCode, CACHE_DIR, codeKeyInputs);
      }
    }

    // Write stage 1 output to cache as importable .mjs file
    const stage1Path = await ensureCodeOnDisk(
      codeEntry,
      compiledCode,
      CACHE_DIR,
      codeKeyInputs,
    );

    // The skeleton is the build-once, introspectable currency every downstream
    // consumer shares: it exports wireConfig/startFlow/__configData (+__devExports)
    // so simulate and preview can introspect and re-wire it, while web/server
    // deploy wrap or run it. One artifact, many targets, so do NOT collapse it into
    // a finished bundle here. For node, step packages stay EXTERNAL on purpose so
    // nft materializes them into a sibling node_modules/ the host resolves on disk
    // (the only way native addons like sqlite .node files can ship); inlining here
    // would break server simulate and native destinations.
    if (buildOptions.skipWrapper || !hasFlow) {
      // Simulation path or no-flow path: concatenate code + data (no wrapper, no stage 2 esbuild)
      const dataDeclaration = `const __configData = ${dataPayload};\nexport { __configData };`;
      // For node platform, prepend createRequire banner (stage 1 no longer adds it)
      const banner =
        buildOptions.platform === 'node'
          ? `import { createRequire } from 'module';const require = createRequire(import.meta.url);\n`
          : '';
      const esmOutput = `${banner}${compiledCode}\n${dataDeclaration}`;
      await fs.writeFile(outputPath, esmOutput);
    } else {
      // Production path: stage 2 esbuild compilation. Reached only by `cdn`
      // (withDev:false), which emits no `__devExports` registry, so there is no
      // `import('<pkg>/dev')` to externalize here. A future registry-bearing
      // non-skeleton browser target would need to externalize `<pkg>/dev` on the
      // browser branch below (gated on `externalizeDev`) to stay dev-free.
      const stage2Entry =
        (buildOptions.platform || 'node') === 'browser'
          ? generateWebEntry(stage1Path, dataPayload, {
              windowCollector: buildOptions.windowCollector,
              windowElb: buildOptions.windowElb,
              platform: buildOptions.platform as 'browser' | 'node',
              observe: readObserveConnect(flowSettings, logger),
            })
          : generateServerEntry(stage1Path, dataPayload);

      const stage2EntryPath = path.join(TEMP_DIR, 'stage2.mjs');
      await fs.writeFile(stage2EntryPath, stage2Entry);

      // Stage 2 esbuild: resolve imports, inline stage 1, minify
      const stage2Options: esbuild.BuildOptions = {
        entryPoints: [stage2EntryPath],
        bundle: true,
        format: 'esm',
        platform: buildOptions.platform as esbuild.Platform,
        outfile: outputPath,
        treeShaking: true,
        logLevel: 'error',
        minify: buildOptions.minify,
        ...(buildOptions.minify && {
          minifyWhitespace: buildOptions.minifyOptions?.whitespace ?? true,
          minifyIdentifiers: buildOptions.minifyOptions?.identifiers ?? true,
          minifySyntax: buildOptions.minifyOptions?.syntax ?? true,
          legalComments: buildOptions.minifyOptions?.legalComments ?? 'none',
          charset: 'utf8',
        }),
      };

      // Platform-specific stage 2 options
      if (buildOptions.platform === 'browser') {
        // Emit the final browser artifact as an IIFE. The served bundle runs
        // as a classic <script> at global scope, so an ESM body would leak its
        // minified top-level declarations (e.g. `ga`) onto `window` and collide
        // with globals like Google Analytics. The IIFE wraps everything in a
        // private closure; the intentional `window.elb`/`window.walkerOS`
        // assignments live inside the entry's own async IIFE and reference
        // `window` explicitly, so they still run. The browser entry has zero
        // exports, so no `globalName` is needed (one would add a window var).
        stage2Options.format = 'iife';
        stage2Options.define = {
          'process.env.NODE_ENV': '"production"',
          global: 'globalThis',
        };
        stage2Options.target = resolveTarget(buildOptions);
      } else {
        // Externalize node builtins AND step packages. Step packages must
        // remain bare imports here too, otherwise stage 2 would re-bundle
        // them after stage 1 carefully kept them external. nft traces the
        // bare imports from the final bundle and copies code from
        // `TEMP_DIR/node_modules/` to `dist/node_modules/`.
        stage2Options.external = [
          ...getNodeExternals(),
          ...expectedTopLevelPackages,
        ];
        stage2Options.banner = {
          js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
        };
        stage2Options.target = resolveTarget(buildOptions);
      }

      try {
        await esbuild.build(stage2Options);
      } finally {
        await esbuild.stop();
      }
    }

    // Get file size and calculate build time
    const outputStats = await fs.stat(outputPath);
    const sizeKB = (outputStats.size / 1024).toFixed(1);
    const buildTime = ((Date.now() - bundleStartTime) / 1000).toFixed(1);
    logger.info(`Output: ${outputPath} (${sizeKB} KB, ${buildTime}s)`);

    // Cache the full build result if caching is enabled (Level 1 fast path)
    if (buildOptions.cache !== false) {
      const configContent = generateCacheKeyContent(
        flowSettings,
        buildOptions,
        versionsHash,
      );
      const buildOutput = await fs.readFile(outputPath, 'utf-8');
      await cacheBuild(configContent, buildOutput, CACHE_DIR);
      logger.debug('Build cached for future use');
    }

    if (buildOptions.platform === 'node') {
      // Server path: trace the just-emitted bundle, copy used files into
      // `outDir/node_modules/`, write an informational sidecar package.json.
      // This emits the sibling node_modules/ that every server host (deploy
      // container, simulate-server) resolves the external @walkeros/* from.
      // Load-bearing, do not remove.
      await runNftServerPath(
        outputPath,
        flowSettings,
        buildOptions,
        TEMP_DIR,
        expectedTopLevelPackages,
        logger,
      );
    }
    // Web flows don't ship a sidecar node_modules — esbuild emits a
    // self-contained IIFE.

    // Collect stats if requested
    let stats: BundleStats | undefined;
    if (showStats) {
      stats = await collectBundleStats(
        outputPath,
        buildOptions.packages,
        bundleStartTime,
        codeEntry,
      );
    }

    // Copy included folders to output directory
    if (buildOptions.include && buildOptions.include.length > 0) {
      const outputDir = path.dirname(outputPath);
      await copyIncludes(
        buildOptions.include,
        buildOptions.configDir || process.cwd(),
        outputDir,
        logger,
      );
    }

    return stats;
  } catch (error) {
    throw error;
  } finally {
    // Clean up per-build directory (contains entry.js with potential secrets)
    if (!buildOptions.tempDir) {
      fs.remove(TEMP_DIR).catch(() => {});
    }
  }
}

async function collectBundleStats(
  outputPath: string,
  packages: BuildOptions['packages'],
  startTime: number,
  entryContent: string,
): Promise<BundleStats> {
  const stats = await fs.stat(outputPath);
  const totalSize = stats.size;
  const buildTime = Date.now() - startTime;

  // Report the packages bundled. Per-package byte attribution is not available
  // without the esbuild metafile, which this two-stage pipeline does not
  // capture, so the breakdown is names only — never a synthesized size.
  const packageStats = Object.entries(packages).map(([name, pkg]) => ({
    name: `${name}@${pkg.version || 'latest'}`,
  }));

  // Tree-shaking is effective if we use named imports (not wildcard imports)
  const hasWildcardImports = /import\s+\*\s+as\s+\w+\s+from/.test(entryContent);
  const treeshakingEffective = !hasWildcardImports;

  return {
    totalSize,
    packages: packageStats,
    buildTime,
    treeshakingEffective,
  };
}

/**
 * Resolve the effective esbuild `target` for a build. Single source of truth
 * shared between `createEsbuildOptions` (where esbuild actually compiles) and
 * the L2 cache-key construction in `bundle()`. Drift between these two would
 * silently alias different builds onto the same cache slot.
 */
function resolveTarget(buildOptions: BuildOptions): string {
  return (
    buildOptions.target ??
    (buildOptions.platform === 'node' ? 'node18' : 'es2018')
  );
}

function createEsbuildOptions(
  buildOptions: BuildOptions,
  entryPath: string,
  outputPath: string,
  tempDir: string,
  packagePaths: Map<string, string>,
  logger: Logger.Instance,
  stepPackageExternals: string[] = [],
  devPackages: string[] = [],
): esbuild.BuildOptions {
  // Don't use aliases - they cause esbuild to bundle even external packages
  // Instead, use absWorkingDir to point to temp directory where node_modules is
  const alias: Record<string, string> = {};

  const baseOptions: esbuild.BuildOptions = {
    entryPoints: [entryPath],
    bundle: true,
    // MUST stay ESM: the stage-1 skeleton is imported (via `await import`) for
    // its named exports (`wireConfig`/`startFlow`/`__configData`/`__devExports`)
    // by simulate/preview/push and the wrap step. esbuild's `iife` format
    // silently drops exports, which would break those consumers.
    format: 'esm' as esbuild.Format,
    platform: buildOptions.platform as esbuild.Platform,
    outfile: outputPath,
    absWorkingDir: tempDir, // Resolve modules from temp directory
    // alias removed - not needed with absWorkingDir
    mainFields: ['module', 'main'], // Prefer ESM over CJS
    treeShaking: true,
    logLevel: 'error',
    minify: buildOptions.minify,
    sourcemap: buildOptions.sourcemap,
    resolveExtensions: ['.mjs', '.js', '.ts', '.json'], // Prefer .mjs

    // Enhanced minification options when minify is enabled
    ...(buildOptions.minify && {
      minifyWhitespace: buildOptions.minifyOptions?.whitespace ?? true,
      minifyIdentifiers: buildOptions.minifyOptions?.identifiers ?? true,
      minifySyntax: buildOptions.minifyOptions?.syntax ?? true,
      legalComments: buildOptions.minifyOptions?.legalComments ?? 'none',
      keepNames: buildOptions.minifyOptions?.keepNames ?? false,
      charset: 'utf8',
    }),
  };

  // Platform-specific configurations
  if (buildOptions.platform === 'browser') {
    baseOptions.define = {
      'process.env.NODE_ENV': '"production"',
      global: 'globalThis',
    };
    // For browser bundles, let users handle Node.js built-ins as needed.
    // Externalize each `<pkg>/dev` ONLY for deploy skeletons
    // (`externalizeDev: true`). Then the registry stays a literal
    // `import('<pkg>/dev')` instead of inlining the /dev graph (zod schemas
    // etc.), and the deploy wrap DCEs the unreferenced registry to zero bytes.
    //
    // For in-process simulate/push (`externalizeDev: false`/undefined), do NOT
    // externalize: esbuild inlines the /dev graph back into the single ESM, so
    // the lazy thunk resolves an already-bundled module. That is what lets the
    // lean simulate-server (cli + core only, no sibling node_modules) resolve
    // schemas host-free. `devPackages` is also empty for the finished IIFE
    // (`cdn`, withDev:false), so the list is empty there regardless.
    const devSubpathExternals =
      buildOptions.externalizeDev === true
        ? devPackages.map((p) => `${p}/dev`)
        : [];
    baseOptions.external = [
      ...(buildOptions.external || []),
      ...devSubpathExternals,
    ];
  } else if (buildOptions.platform === 'node') {
    // Node builtins are always external. Step packages (sources, destinations,
    // transformers, stores resolved by pacote) are also externalized so the
    // emitted entry stays small: nft traces those bare imports from the
    // emitted bundle and copies the actual code from `tempDir/node_modules/`
    // into the sibling `dist/node_modules/`. Without this, esbuild would
    // inline every step package's source into flow.mjs and we would ship
    // both the inline copy and the nft-traced copy. Keeping step packages
    // external (not inlined) is what lets the host resolve them from the
    // nft-traced sibling node_modules/, which is what makes server simulate
    // and native-addon destinations work; inlining would regress both.
    const nodeExternals = getNodeExternals();
    const externalsParts = [nodeExternals, stepPackageExternals];
    if (buildOptions.external) externalsParts.push(buildOptions.external);
    baseOptions.external = externalsParts.flat();

    // createRequire shim is added in stage 2, not here.
    // Stage 1 produces importable ESM; stage 2 wraps it with the banner.
  }

  // Set target via shared resolver so the L2 cache key cannot drift from the
  // value esbuild actually compiles against.
  baseOptions.target = resolveTarget(buildOptions);

  return baseOptions;
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
 * Get the complete list of Node.js built-in modules for esbuild external config.
 * Includes bare names, node: prefixed, and subpath patterns.
 * Only Node builtins — no npm packages.
 */
export function getNodeExternals(): string[] {
  const externals: string[] = [];
  for (const mod of builtinModules) {
    if (mod.startsWith('_')) continue; // Skip internal modules
    externals.push(mod, `node:${mod}`, `${mod}/*`, `node:${mod}/*`);
  }
  return externals;
}

/**
 * Server-only post-build pass: run nft on the just-emitted server bundle to
 * copy every actually-used file into `outDir/node_modules/`, then write a
 * minimal informational `package.json` next to it that lists the step
 * packages declared by the flow. The artifact shape is deliberately
 * directory-shaped: `{ flow.mjs, package.json, node_modules/ }`.
 *
 * `tempDir` is the pacote-populated install root (the same dir esbuild
 * stage 1 used as `absWorkingDir`). We trace from there so nft and esbuild
 * see the same `node_modules/` tree. The bundle at `outputPath` lives
 * outside `tempDir`, so we stage a copy inside `tempDir` to give nft an
 * entry whose relative path under `base` does not escape via `..`.
 * `expectedPackages` is the pacote-resolved top-level set, used for the
 * post-trace cross-check that catches dynamic-require regressions and
 * hoisted-symlink mistakes.
 */
async function runNftServerPath(
  outputPath: string,
  flowSettings: Flow,
  buildOptions: BuildOptions,
  tempDir: string,
  expectedPackages: string[],
  logger: Logger.Instance,
): Promise<void> {
  const outDir = path.dirname(outputPath);

  // Wire `flow.<name>.config.bundle.traceInclude` into the file tracer. The
  // user-facing field is under the per-flow bundle block; the loader threads
  // it through `buildOptions.traceInclude`. Each entry is a literal path or a
  // glob (resolved against `tempDir`). `traceAndCopy` performs the expansion.
  const flowExtraIncludes: string[] = [
    ...(flowSettings.config?.bundle?.traceInclude ?? []),
    ...(buildOptions.traceInclude ?? []),
  ];

  // Stage the just-emitted bundle into tempDir so nft sees an entry whose
  // path is relative to `base` (without `..`). Without this, the path-
  // escape guard in `traceAndCopy` rejects the entry's own fileList entry
  // (resolved relative to base, it would point outside outDir).
  const stagedEntry = path.join(tempDir, '__nft-flow.mjs');
  await fs.copyFile(outputPath, stagedEntry);

  let result;
  try {
    result = await traceAndCopy({
      entry: stagedEntry,
      base: tempDir,
      outDir,
      extraIncludes: flowExtraIncludes,
    });
  } finally {
    // The staged copy is internal scaffolding; the real bundle stays at
    // outputPath. Clean up the staged file but never touch outputPath.
    await fs.remove(stagedEntry).catch(() => {});
  }

  // The staged entry itself appears in nft's fileList. Drop it from the
  // copy results before the cross-check so we don't accidentally ship a
  // copy of the bundle inside `outDir/__nft-flow.mjs` (and so the
  // assertDepsTraced check sees only the resolved package files).
  const stagedRel = path.relative(await fs.realpath(tempDir), stagedEntry);
  const trimmedFileList = result.fileList.filter((f) => f !== stagedRel);
  await fs.remove(path.join(outDir, stagedRel)).catch(() => {});

  // Cross-check: every package pacote resolved at the top level must appear
  // in the trace output. Catches hoisted-symlink misses, nft per-release
  // regressions, and dynamic-require deps nft cannot statically follow.
  // The check is always meaningful now (the expected set comes from the
  // install layer, not user package.json), so there is no opt-out flag.
  if (expectedPackages.length > 0) {
    assertDepsTraced({
      fileList: trimmedFileList,
      expectedPackages,
    });
  }

  const stepPackages = collectAllStepPackages(flowSettings);
  const dependencies: Record<string, string> = {};
  for (const name of [...stepPackages].sort()) {
    if (name.startsWith('.') || name.startsWith('/')) continue;
    dependencies[name] = '*';
  }

  const sidecarPath = path.join(outDir, 'package.json');
  await fs.writeJson(
    sidecarPath,
    {
      name: 'walkeros-bundle',
      private: true,
      type: 'module',
      dependencies,
    },
    { spaces: 2 },
  );
  logger.debug(
    `nft-trace: copied ${result.copied} file(s); wrote ${sidecarPath}`,
  );
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
  packages: BuildOptions['packages'],
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

/**
 * Detects named-import requests across sources, destinations, transformers, stores.
 * Returns a map of package names to sets of export names that must be named-imported.
 */
export function detectNamedImports(
  flowSettings: Flow,
): Map<string, Set<string>> {
  const namedImports = new Map<string, Set<string>>();

  const addNamed = (pkg: string, importName: string): void => {
    if (!namedImports.has(pkg)) namedImports.set(pkg, new Set());
    namedImports.get(pkg)!.add(importName);
  };

  const visit = (
    bucket: Record<string, { package?: string; import?: string }> | undefined,
  ): void => {
    if (!bucket) return;
    for (const step of Object.values(bucket)) {
      if (typeof step.package === 'string' && typeof step.import === 'string') {
        addNamed(step.package, step.import);
      }
    }
  };

  visit(flowSettings.sources);
  visit(flowSettings.destinations);
  visit(flowSettings.transformers);
  visit(flowSettings.stores);

  return namedImports;
}

interface ImportGenerationResult {
  importStatements: string[];
  devExportEntries: string[];
  // Packages that received a lazy `/dev` registry entry. Exposed so a later
  // browser-build step can externalize the same `<pkg>/dev` specifiers without
  // recomputing the set (preventing drift between the registry and externals).
  devPackages: string[];
}

/**
 * Generates import statements and examples mappings from build packages.
 * Handles explicit imports, default imports for destinations/sources, and utility imports.
 */
async function generateImportStatements(
  packages: BuildOptions['packages'],
  destinationPackages: Set<string>,
  sourcePackages: Set<string>,
  transformerPackages: Set<string>,
  storePackages: Set<string>,
  namedImports: Map<string, Set<string>>,
  packagePaths: Map<string, string>,
  withDev: boolean,
): Promise<ImportGenerationResult> {
  const importStatements: string[] = [];
  const usedPackages = new Set([
    ...destinationPackages,
    ...sourcePackages,
    ...transformerPackages,
    ...storePackages,
  ]);

  for (const [packageName, packageConfig] of Object.entries(packages)) {
    const isUsedByDestOrSource = usedPackages.has(packageName);
    const hasNamed = namedImports.has(packageName);

    // Track what named imports we'll generate to avoid duplicates
    const namedImportsToGenerate: string[] = [];

    // 1. Generate default import for packages used by sources/destinations
    //    UNLESS a named import is specified (allows packages without default export)
    if (isUsedByDestOrSource && !hasNamed) {
      const varName = packageNameToVariable(packageName);
      importStatements.push(`import ${varName} from '${packageName}';`);
    }

    // 2. Generate named import when steps reference an export by name
    if (hasNamed) {
      const codes = Array.from(namedImports.get(packageName)!);
      namedImportsToGenerate.push(...codes);
    }

    // 3. Process imports list (utilities and special syntax)
    if (packageConfig.imports && packageConfig.imports.length > 0) {
      const uniqueImports = [...new Set(packageConfig.imports)];

      // Handle special "default as X" syntax
      for (const imp of uniqueImports) {
        if (imp.startsWith('default as ')) {
          // Only generate default import if not already generated above
          if (!isUsedByDestOrSource || hasNamed) {
            const defaultImportName = imp.replace('default as ', '');
            importStatements.push(
              `import ${defaultImportName} from '${packageName}';`,
            );
          }
        } else {
          // Add to named imports if not already in named imports
          if (!namedImportsToGenerate.includes(imp)) {
            namedImportsToGenerate.push(imp);
          }
        }
      }
    }

    // 4. Auto-import startFlow from collector (always required for flows)
    if (
      packageName === '@walkeros/collector' &&
      !namedImportsToGenerate.includes('startFlow')
    ) {
      namedImportsToGenerate.push('startFlow');
    }

    // 5. Generate combined named imports statement
    if (namedImportsToGenerate.length > 0) {
      const importList = namedImportsToGenerate.join(', ');
      importStatements.push(`import { ${importList} } from '${packageName}';`);
    }

    // Examples are no longer auto-imported - simulator loads them dynamically
  }

  // Register the /dev surface for packages that expose a ./dev export as a
  // lazy dynamic import: `'<pkg>': () => import('<pkg>/dev')`. The specifier
  // stays a literal so a node host can resolve it and esbuild can statically
  // analyse it. Because the registry entry is an unreferenced thunk, the
  // deploy wrap DCEs the whole /dev graph (zod schemas, etc.) to zero bytes,
  // while simulate/push await the thunk to pull the dev module in on demand.
  // The same dev-package set is reused for browser-build externals via
  // computeDevPackages, so the registry and externals can never drift apart.
  const devPackages = withDev
    ? await computeDevPackages(usedPackages, packagePaths)
    : [];
  const devExportEntries = devPackages.map(
    (packageName) => `'${packageName}': () => import('${packageName}/dev')`,
  );

  return { importStatements, devExportEntries, devPackages };
}

/**
 * Resolves which of the given packages expose a `./dev` subpath export.
 * Single source of truth for the lazy `/dev` registry codegen and for the
 * browser build's `/dev` externals, keeping the two in lockstep.
 */
export async function computeDevPackages(
  usedPackages: Iterable<string>,
  packagePaths: Map<string, string>,
): Promise<string[]> {
  const devPackages: string[] = [];
  for (const packageName of usedPackages) {
    const localPath = packagePaths.get(packageName);
    if (!localPath) continue;

    try {
      const pkgJsonPath = path.join(localPath, 'package.json');
      const pkgJson = await fs.readJSON(pkgJsonPath);
      const exports = pkgJson.exports;
      if (exports && typeof exports === 'object' && './dev' in exports) {
        devPackages.push(packageName);
      }
    } catch {
      // Package doesn't have a readable package.json, skip gracefully
    }
  }
  return devPackages;
}

/** Package name of the browser source, the single writer of window[settings.elb]. */
const BROWSER_SOURCE_PACKAGE = '@walkeros/web-source-browser';

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
 * Strip an optional version/range suffix from a package spec so
 * `@walkeros/web-source-browser@2.0.0` matches the bare package name.
 */
function packageSpecName(spec: string): string {
  return parsePackageSpec(spec).name;
}

/** Read `config.settings.elb` from a source step, or undefined if not a string. */
function readSourceElb(source: Flow.Source): string | undefined {
  if (!isObject(source.config)) return undefined;
  const settings = source.config.settings;
  if (!isObject(settings)) return undefined;
  return typeof settings.elb === 'string' ? settings.elb : undefined;
}

/**
 * Forward the deprecated `flow.config.settings.windowElb` build hint onto the
 * browser source's own `config.settings.elb`.
 *
 * The browser source is the single writer of `window[settings.elb]` (default
 * 'elb'); the bundle no longer emits a competing `window[windowElb] = elb`
 * assignment. Forwarding keeps a custom global name working through the
 * deprecation window. Runs before config embedding so the forwarded value lands
 * inside the bundle's `__configData`.
 *
 * Matches only the canonical `@walkeros/web-source-browser` package by design:
 * this is a conservative deprecation shim, so forks or renamed repackages of the
 * browser source get the "no effect" warning rather than a silent forward.
 *
 * Never mutates the input flow. Warns once, naming both keys.
 */
export function bridgeWindowElb(flow: Flow, logger?: Logger.Instance): Flow {
  const raw = flow.config?.settings?.windowElb;
  if (typeof raw !== 'string' || raw === '') return flow;
  const windowElb = raw;

  const sources = flow.sources ?? {};
  const browserEntries = Object.entries(sources).filter(
    ([, source]) =>
      typeof source.package === 'string' &&
      packageSpecName(source.package) === BROWSER_SOURCE_PACKAGE,
  );

  if (browserEntries.length === 0) {
    logger?.warn(
      `config.settings.windowElb "${windowElb}" has no effect: the flow has no ${BROWSER_SOURCE_PACKAGE} source to install window["${windowElb}"]. Remove config.settings.windowElb or add a browser source.`,
    );
    return flow;
  }

  const toForward = browserEntries.filter(
    ([, source]) => readSourceElb(source) === undefined,
  );

  if (toForward.length === 0) {
    logger?.warn(
      `config.settings.windowElb "${windowElb}" is ignored: the browser source already sets config.settings.elb. Remove the deprecated config.settings.windowElb.`,
    );
    return flow;
  }

  // Apply on a shallow clone so the input flow is never mutated.
  const nextSources: Record<string, Flow.Source> = { ...sources };
  for (const [id, source] of toForward) {
    const config = isObject(source.config) ? source.config : {};
    const settings = isObject(config.settings) ? config.settings : {};
    nextSources[id] = {
      ...source,
      config: { ...config, settings: { ...settings, elb: windowElb } },
    };
  }

  const forwardedIds = toForward.map(([id]) => id).join(', ');
  logger?.warn(
    `config.settings.windowElb is deprecated; set config.settings.elb on the browser source instead. Forwarded windowElb "${windowElb}" to config.settings.elb on sources.${forwardedIds}.`,
  );

  return { ...flow, sources: nextSources };
}

/**
 * Creates the entry point code for the bundle.
 * Generates imports, config object, and platform-specific wrapper programmatically.
 */
export async function createEntryPoint(
  flowSettings: Flow,
  buildOptions: BuildOptions,
  packagePaths: Map<string, string>,
  logger?: Logger.Instance,
): Promise<{
  codeEntry: string;
  dataPayload: string;
  hasFlow: boolean;
  devPackages: string[];
}> {
  // Bridge the deprecated windowElb build hint onto the browser source's
  // settings.elb before any config embedding, so the forwarded value is baked
  // into the __configData payload below.
  flowSettings = bridgeWindowElb(flowSettings, logger);

  // Detect packages used by all step types
  const sourcePackages = detectStepPackages(flowSettings, 'sources');
  const destinationPackages = detectStepPackages(flowSettings, 'destinations');
  const transformerPackages = detectStepPackages(flowSettings, 'transformers');
  const storePackages = detectStepPackages(flowSettings, 'stores');
  const namedImports = detectNamedImports(flowSettings);

  // Validate $store. references before code generation
  const storeIds = new Set(Object.keys(flowSettings.stores || {}));
  validateStoreReferences(flowSettings, storeIds);

  // Validate component names are valid JS identifiers (they become property names in generated code)
  if (flowSettings.sources)
    validateComponentNames(flowSettings.sources, 'sources');
  if (flowSettings.destinations)
    validateComponentNames(flowSettings.destinations, 'destinations');
  if (flowSettings.transformers)
    validateComponentNames(flowSettings.transformers, 'transformers');
  if (flowSettings.stores)
    validateComponentNames(flowSettings.stores, 'stores');

  // Generate import statements.
  // withDev is resolved from the BundleTarget preset by the public `bundle()`
  // entry point. When called directly via `bundleCore` (push, simulate, tests),
  // we fall back to `skipWrapper === true` for backward compatibility — those
  // call sites historically relied on skipWrapper to pull in /dev schemas.
  const withDev =
    buildOptions.withDev !== undefined
      ? buildOptions.withDev === true
      : buildOptions.skipWrapper === true;
  const { importStatements, devExportEntries, devPackages } =
    await generateImportStatements(
      buildOptions.packages,
      destinationPackages,
      sourcePackages,
      transformerPackages,
      storePackages,
      namedImports,
      packagePaths,
      withDev,
    );

  const importsCode = importStatements.join('\n');
  const hasFlow =
    Object.values(flowSettings.sources || {}).some(
      (s) => s.package || hasCodeReference(s.code),
    ) ||
    Object.values(flowSettings.destinations || {}).some(
      (d) => d.package || hasCodeReference(d.code),
    );

  // If no sources/destinations, just return user code with imports (no flow wrapper)
  if (!hasFlow) {
    const userCode = buildOptions.code || '';
    return {
      codeEntry: importsCode ? `${importsCode}\n\n${userCode}` : userCode,
      dataPayload: '{}',
      hasFlow: false,
      devPackages,
    };
  }

  // Build split config object (code skeleton + data payload)
  const { storesDeclaration, codeConfigObject, dataPayload } =
    buildSplitConfigObject(flowSettings, namedImports);

  // Generate platform-agnostic wireConfig module with __data parameter
  const wireConfigModule = generateSplitWireConfigModule(
    storesDeclaration,
    codeConfigObject,
    buildOptions.code || '',
  );

  // Append __devExports if any packages expose /dev
  const devExportsBlock =
    devExportEntries.length > 0
      ? `\nexport const __devExports = {\n  ${devExportEntries.join(',\n  ')},\n};`
      : '';

  // Return ESM module (imports + wireConfig + startFlow re-export + optional devExports)
  const fullModule = wireConfigModule + devExportsBlock;
  const codeEntry = importsCode
    ? `${importsCode}\n\n${fullModule}`
    : fullModule;

  return { codeEntry, dataPayload, hasFlow: true, devPackages };
}

interface EsbuildError {
  errors?: Array<{
    text: string;
    location?: {
      file: string;
      line: number;
      column: number;
    };
  }>;
  message?: string;
}

function createBuildError(buildError: EsbuildError, code: string): Error {
  if (!buildError.errors || buildError.errors.length === 0) {
    return new Error(`Build failed: ${buildError.message || buildError}`);
  }

  const firstError = buildError.errors[0];
  const location = firstError.location;

  if (location && location.file && location.file.includes('entry.js')) {
    // Error is in our generated entry point (code)
    const line = location.line;
    const column = location.column;
    const codeLines = code.split('\n');
    const errorLine = codeLines[line - 1] || '';

    return new Error(
      `Code syntax error at line ${line}, column ${column}:\n` +
        `  ${errorLine}\n` +
        `  ${' '.repeat(column - 1)}^\n` +
        `${firstError.text}`,
    );
  }

  // Error is in package code or other build issue
  return new Error(
    `Build error: ${firstError.text}\n` +
      (location
        ? `  at ${location.file}:${location.line}:${location.column}`
        : ''),
  );
}

/**
 * Build the wireConfig data payload for a flow as a plain object.
 *
 * This is the same object the bundler bakes into a skeleton as
 * `__configData` (section, step id, data-layer props), produced by the
 * same classification pass the bundler uses. Callers that inject data at
 * simulate time (the `data` option of the simulate functions) must build
 * the FULL payload from the FULL config with this helper; injection
 * replaces the baked payload, it does not merge.
 *
 * Mirrors the bundler's own call path (`detectNamedImports` feeding
 * `buildSplitConfigObject`) so the result stays identical to the baked
 * payload by construction.
 */
export function buildDataPayload(flowSettings: Flow): Record<string, unknown> {
  return buildSplitConfigObject(flowSettings, detectNamedImports(flowSettings))
    .dataPayloadObj;
}

/**
 * Bake flow-config provenance onto the collector before codegen.
 *
 * The flow name keys this flow's entry in `event.source.release`; the release
 * value stamps that key. Both are set only when absent, so a flow (or an
 * upstream caller) that already authored `collector.name`/`collector.release`
 * keeps its own values. The release falls back to an explicit id, then to a
 * bundle-time timestamp so a standalone bundle still carries a distinguishable
 * release instead of the runtime `__VERSION__` default.
 *
 * `now` is injectable so tests assert a fixed value; production uses wall time.
 */
export function applyCollectorProvenance(
  flowSettings: Flow,
  flowName: string,
  release?: string,
  now: () => string = () => new Date().toISOString(),
): void {
  const collector = flowSettings.collector ?? {};
  collector.name ??= flowName;
  collector.release ??= release ?? now();
  flowSettings.collector = collector;
}

/**
 * Build split config object from flow configuration.
 * Produces THREE outputs:
 * - codeConfigObject: skeleton with code references and __data.* placeholders
 * - dataPayloadObj: plain JSON-serializable object with settings, mappings, etc.
 * - dataPayload: the stringified form of dataPayloadObj the codegen embeds
 *
 * Inline code steps bypass classification and go entirely to the code skeleton.
 * Package-based steps are split via classifyStepProperties.
 */
export function buildSplitConfigObject(
  flowSettings: Flow,
  namedImports: Map<string, Set<string>>,
): {
  storesDeclaration: string;
  codeConfigObject: string;
  dataPayloadObj: Record<string, unknown>;
  dataPayload: string;
} {
  const sources = flowSettings.sources || {};
  const destinations = flowSettings.destinations || {};
  const transformers = flowSettings.transformers || {};
  const stores = flowSettings.stores || {};

  // Data payload accumulator
  const dataPayloadObj: Record<string, Record<string, unknown>> = {};

  // Union of all step types — share helpers across sources/destinations/transformers/stores
  type FlowStep =
    | Flow.Source
    | Flow.Destination
    | Flow.Transformer
    | Flow.Store;

  // Helper to resolve the code variable for a package-based step
  function resolveCodeVar(step: FlowStep): string {
    // Named-import step: use the user-specified export name
    if (typeof step.import === 'string' && step.package) {
      return step.import;
    }
    // Default-import step: derive the variable from the package name
    return packageNameToVariable(step.package!);
  }

  // Helper to build step properties (excluding 'code', 'package', and 'import')
  function getStepProps(step: FlowStep): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(step)) {
      if (key === 'code' || key === 'package' || key === 'import') continue;
      if (value !== undefined && value !== null) {
        props[key] = value;
      }
    }
    return props;
  }

  // Helper to build a split step entry for the code skeleton
  function buildSplitStepEntry(
    section: string,
    stepId: string,
    step: FlowStep,
  ): string {
    const codeVar = resolveCodeVar(step);
    const stepProps = getStepProps(step);
    const { codeProps, dataProps } = classifyStepProperties(stepProps);

    const codeEntries: string[] = [];
    codeEntries.push(`code: ${codeVar}`);

    // Code-layer props (serialized with processConfigValue)
    for (const [key, value] of Object.entries(codeProps)) {
      if (key === 'code') continue; // already handled above
      codeEntries.push(`${key}: ${processConfigValue(value)}`);
    }

    // Data-layer prop references
    for (const key of Object.keys(dataProps)) {
      codeEntries.push(`${key}: __data.${section}.${stepId}.${key}`);
    }

    // Accumulate data payload
    if (Object.keys(dataProps).length > 0) {
      if (!dataPayloadObj[section]) dataPayloadObj[section] = {};
      dataPayloadObj[section][stepId] = dataProps;
    }

    return `    ${stepId}: {\n      ${codeEntries.join(',\n      ')}\n    }`;
  }

  // Validate references
  Object.entries(sources).forEach(([name, source]) => {
    validateReference('Source', name, source);
  });
  Object.entries(destinations).forEach(([name, dest]) => {
    validateReference('Destination', name, dest);
  });
  Object.entries(transformers).forEach(([name, transformer]) => {
    validateReference('Transformer', name, transformer);
  });

  // Build sources
  const sourcesEntries = Object.entries(sources)
    .filter(([, source]) => source.package || hasCodeReference(source.code))
    .map(([key, source]) => {
      if (isInlineCode(source.code)) {
        return `    ${key}: ${generateInlineCode(source.code, (source.config as object) || {}, source.env as object, { next: source.next })}`;
      }
      return buildSplitStepEntry('sources', key, source);
    });

  // Build destinations
  const destinationsEntries = Object.entries(destinations)
    .filter(([, dest]) => dest.package || hasCodeReference(dest.code))
    .map(([key, dest]) => {
      if (isInlineCode(dest.code)) {
        return `    ${key}: ${generateInlineCode(dest.code, (dest.config as object) || {}, dest.env as object, { before: dest.before, next: dest.next }, true)}`;
      }
      return buildSplitStepEntry('destinations', key, dest);
    });

  // Build transformers
  const transformersEntries = Object.entries(transformers)
    .filter(
      ([, transformer]) =>
        transformer.package ||
        hasCodeReference(transformer.code) ||
        isPathStepEntry({ ...transformer }, 'Transformer'),
    )
    .map(([key, transformer]) => {
      if (isInlineCode(transformer.code)) {
        return `    ${key}: ${generateInlineCode(transformer.code, (transformer.config as object) || {}, transformer.env as object, { before: transformer.before, next: transformer.next })}`;
      }
      if (isPathStepEntry({ ...transformer }, 'Transformer')) {
        // Path: code-less passthrough. Emit only wiring fields; the runtime
        // synthesizes the push function.
        const chainLines: string[] = [];
        if (transformer.before !== undefined) {
          chainLines.push(`before: ${JSON.stringify(transformer.before)}`);
        }
        if (transformer.next !== undefined) {
          chainLines.push(`next: ${JSON.stringify(transformer.next)}`);
        }
        if (transformer.cache !== undefined) {
          chainLines.push(`cache: ${JSON.stringify(transformer.cache)}`);
        }
        if (transformer.config !== undefined) {
          chainLines.push(
            `config: ${processConfigValue(transformer.config as object)}`,
          );
        }
        return `    ${key}: {\n      ${chainLines.join(',\n      ')}\n    }`;
      }
      return buildSplitStepEntry('transformers', key, transformer);
    });

  // Build stores
  Object.entries(stores).forEach(([name, store]) => {
    if (store.package || hasCodeReference(store.code)) {
      validateReference('Store', name, store);
    }
  });

  const storesEntries = Object.entries(stores)
    .filter(([, store]) => store.package || hasCodeReference(store.code))
    .map(([key, store]) => {
      if (isInlineCode(store.code)) {
        return `    ${key}: ${generateInlineCode(store.code, (store.config as object) || {}, store.env as object)}`;
      }

      const codeVar = resolveCodeVar(store);
      const storeProps = getStepProps(store);
      const { codeProps, dataProps } = classifyStepProperties(storeProps);

      const codeEntries: string[] = [];
      codeEntries.push(`code: ${codeVar}`);

      for (const [propKey, value] of Object.entries(codeProps)) {
        if (propKey === 'code') continue;
        codeEntries.push(`${propKey}: ${processConfigValue(value)}`);
      }

      for (const propKey of Object.keys(dataProps)) {
        codeEntries.push(`${propKey}: __data.stores.${key}.${propKey}`);
      }

      if (Object.keys(dataProps).length > 0) {
        if (!dataPayloadObj['stores']) dataPayloadObj['stores'] = {};
        dataPayloadObj['stores'][key] = dataProps;
      }

      return `    ${key}: {\n      ${codeEntries.join(',\n      ')}\n    }`;
    });

  // Build stores declaration
  const storesDeclaration =
    storesEntries.length > 0
      ? `const stores = {\n${storesEntries.join(',\n')}\n};`
      : 'const stores = {};';

  // Build collector
  let collectorStr = '';
  if (flowSettings.collector) {
    if (containsCodeMarkers(flowSettings.collector)) {
      // Collector has code markers — keep in code skeleton
      collectorStr = `,\n  ...${processConfigValue(flowSettings.collector)}`;
    } else {
      // Plain collector — put in data payload. Spread copies own enumerable
      // properties into a Record<string, unknown>-compatible target.
      dataPayloadObj['collector'] = { ...flowSettings.collector };
      collectorStr = `,\n  ...__data.collector`;
    }
  }

  // Build transformers section
  const transformersStr =
    transformersEntries.length > 0
      ? `,\n  transformers: {\n${transformersEntries.join(',\n')}\n  }`
      : '';

  const codeConfigObject = `{
  sources: {
${sourcesEntries.join(',\n')}
  },
  destinations: {
${destinationsEntries.join(',\n')}
  }${transformersStr},
  stores${collectorStr}
}`;

  const dataPayload = JSON.stringify(dataPayloadObj, null, 2);

  return { storesDeclaration, codeConfigObject, dataPayloadObj, dataPayload };
}

/**
 * Runtime guard emitted once into the bundle preamble. Deferred $secret
 * references serialize to `__walkerosRequireSecret("KEY", process.env["KEY"])`;
 * this helper throws a clear key-only error when the secret is absent or empty,
 * instead of letting `undefined` flow downstream into a cryptic failure. It
 * collapses missing and empty (no value oracle) and never logs or echoes the
 * value.
 */
const SECRET_GUARD_HELPER = `function __walkerosRequireSecret(key, val) {
  if (val == null || val === '') throw new Error('WalkerOS: required secret "' + key + '" is not set');
  return val;
}`;

/**
 * Generate platform-agnostic ESM module with wireConfig(__data) and startFlow re-export.
 * This is the split variant — code skeleton receives data payload at runtime.
 */
export function generateSplitWireConfigModule(
  storesDeclaration: string,
  codeConfigObject: string,
  userCode: string,
): string {
  const codeSection = userCode ? `\n${userCode}\n` : '';

  return `${SECRET_GUARD_HELPER}

export function wireConfig(__data) {
  ${storesDeclaration}

  const config = ${codeConfigObject};${codeSection}

  return config;
}

export { startFlow };`;
}

/**
 * Generate a stage 2 entry file for server bundles.
 * Imports startFlow and wireConfig from the stage 1 .mjs file,
 * embeds the data payload, and exports a factory function.
 */
export function generateServerEntry(
  stage1Path: string,
  dataPayload: string,
): string {
  const stage1Specifier = toFileImportSpecifier(stage1Path);
  return `import { startFlow, wireConfig } from '${stage1Specifier}';

const __configData = ${dataPayload};

export default async function(context = {}) {
  const config = wireConfig(__configData);

  if (context.logger) config.logger = context.logger;

  if (context.sourceSettings && config.sources) {
    for (const src of Object.values(config.sources)) {
      if (src.config?.settings) {
        src.config.settings = { ...src.config.settings, ...context.sourceSettings };
      }
    }
  }

  const result = await startFlow(config);

  // Telemetry observer installation: the host (pipeline.ts) builds the
  // observer functions via createTelemetryObserver + createBatchedPoster
  // and forwards them through context. Added to collector.observers so the
  // runtime self-emission loop drives them.
  if (context.observers) {
    for (const observer of context.observers) {
      result.collector.observers.add(observer);
    }
  }

  // The host forwards the level supplier beside the observers; the collector
  // capture path reads it to decide destination call capture at trace.
  if (context.observeLevel) result.collector.observeLevel = context.observeLevel;

  const httpSource = Object.values(result.collector.sources || {})
    .find(s => 'httpHandler' in s && typeof s.httpHandler === 'function');

  return { ...result, httpHandler: httpSource ? httpSource.httpHandler : undefined };
}`;
}

/**
 * Read the STATIC observe connect config from a flow's `config.observe`.
 * Returns the public `{ url, binding }` pair (trimmed) plus the optional
 * `level`/`sample` controls only when both pair members are non-empty
 * strings; anything else yields undefined so the web entry emits zero
 * observe wiring bytes. Every carried field is public; dropping `level`
 * here would silently override an explicit `level: 'off'` with the
 * runtime's `standard` default once a credential attaches. A block that
 * names `url` or `binding` but does not form a usable pair (missing,
 * empty, or whitespace-only member) warns at build time, because silent
 * zero-wiring in a minified bundle is invisible to the author. A pure
 * level/sample block is valid managed-telemetry config, not a failed
 * connect pair, and stays silent. Secrets never live in flow config: the
 * runtime connect module reads the per-session credential out-of-band at
 * boot.
 */
export function readObserveConnect(
  flowSettings: Flow,
  logger?: Logger.Instance,
): ObserveWeb | undefined {
  const observe = flowSettings.config?.observe;
  if (!observe) return undefined;
  const { url, binding, level, sample } = observe;
  if (url === undefined && binding === undefined) return undefined;
  const trimmedUrl = typeof url === 'string' ? url.trim() : '';
  const trimmedBinding = typeof binding === 'string' ? binding.trim() : '';
  if (trimmedUrl !== '' && trimmedBinding !== '') {
    return {
      url: trimmedUrl,
      binding: trimmedBinding,
      // Same JSON-borne prudence as the pair: only known-shaped public
      // values reach the emitted literal.
      ...(level === 'off' || level === 'standard' || level === 'trace'
        ? { level }
        : {}),
      // Sample is a fraction in [0, 1] per the Flow.Observe contract; the
      // range test also drops NaN and the infinities.
      ...(typeof sample === 'number' && sample >= 0 && sample <= 1
        ? { sample }
        : {}),
    };
  }
  const missing = [
    ...(trimmedUrl === '' ? ['url'] : []),
    ...(trimmedBinding === '' ? ['binding'] : []),
  ].join(' and ');
  logger?.warn(
    `config.observe has no effect: missing or empty ${missing}. Observe connect wiring was skipped; set both config.observe.url and config.observe.binding to non-empty public values.`,
  );
  return undefined;
}

/**
 * Emit the STATIC observe connect assignment for a generated entry: bake
 * ONLY the public connect values (`url` + `binding`, plus the optional
 * `flowId`/`level`/`sample` scoping) onto the startFlow config. The runtime
 * connect module inside startFlow does the credential/slot work at boot
 * (the per-session secret arrives out-of-band via the `elbObserve`
 * companion); no emitted byte here is ever secret.
 */
function emitObserveAssignment(observe: ObserveWeb): string {
  const literal: ObserveWeb = {
    url: observe.url,
    binding: observe.binding,
    ...(observe.flowId !== undefined ? { flowId: observe.flowId } : {}),
    ...(observe.level !== undefined ? { level: observe.level } : {}),
    ...(observe.sample !== undefined ? { sample: observe.sample } : {}),
  };
  return `
  config.observe = ${JSON.stringify(literal)};`;
}

/**
 * Generate a stage 2 entry file for web/browser bundles.
 * Imports startFlow and wireConfig from the stage 1 .mjs file,
 * embeds the data payload, and wraps in an async IIFE with window assignments.
 */
export function generateWebEntry(
  stage1Path: string,
  dataPayload: string,
  options: {
    windowCollector?: string;
    windowElb?: string;
    /** Runtime platform. 'browser' emits env.window/env.document injection; 'node' omits it. Default 'browser' for backward compat. */
    platform?: 'browser' | 'node';
    /**
     * STATIC observe connect config baked onto the startFlow config. PUBLIC
     * values only (url + binding); the runtime connect module reads the
     * per-session credential out-of-band at boot. Absent = zero observe
     * wiring bytes in the emitted entry.
     */
    observe?: ObserveWeb;
  } = {},
): string {
  const assignments: string[] = [];
  if (options.windowCollector) {
    assignments.push(
      `  if (typeof window !== 'undefined') window['${options.windowCollector}'] = collector;`,
    );
  }
  // windowElb is intentionally NOT assigned here: the browser source is the
  // single writer of window[settings.elb]. Emitting it too raced the source's
  // own assignment. `windowElb` survives as a deprecated build hint that the
  // config bridge forwards onto the browser source's settings.elb.
  const assignmentCode =
    assignments.length > 0 ? '\n' + assignments.join('\n') : '';

  const platform = options.platform ?? 'browser';
  const envBlock =
    platform === 'browser'
      ? `
  if (config.sources) {
    for (const key of Object.keys(config.sources)) {
      const source = config.sources[key];
      if (!source) continue;
      const env = source.env ?? (source.env = {});
      env.window = env.window ?? (typeof window !== 'undefined' ? window : undefined);
      env.document = env.document ?? (typeof document !== 'undefined' ? document : undefined);
    }
  }`
      : '';

  const stage1Specifier = toFileImportSpecifier(stage1Path);

  const observeBlock = options.observe
    ? emitObserveAssignment(options.observe)
    : '';

  return `import { startFlow, wireConfig } from '${stage1Specifier}';

const __configData = ${dataPayload};

(async () => {
  const config = wireConfig(__configData);${envBlock}${observeBlock}
  const { collector, elb } = await startFlow(config);${assignmentCode}
})();`;
}

/**
 * Generate a stage 2 entry file for wrapping an ALREADY-embedded skeleton.
 *
 * Unlike `generateWebEntry`, this variant imports `__configData` from the
 * skeleton (instead of inlining a `dataPayload` string). Used by the
 * publish-time `wrapSkeleton` helper, which runs on a stage 1 skeleton
 * produced via `bundle({ skipWrapper: true })` — those skeletons already
 * export `__configData` alongside `wireConfig` and `startFlow`.
 */
/**
 * Preview activation wiring. When present and enabled, the generated entry
 * imports the activator from core and lets it decide whether a preview bundle
 * boots in place of this flow. The bundle carries only PUBLIC values: a keyring,
 * an issuer, and opaque bindings. Never a project id, never a secret.
 */
export interface WrapEntryPreview {
  enabled: boolean;
  keyring: PreviewKey[];
  iss: string;
  /** Opaque project binding. Omitted only on demo hosts. */
  pb?: string;
  /** Demo hosts only: accept another project's preview, confined to demoAllowlist. */
  acceptForeign?: boolean;
  demoAllowlist?: string[];
  /** Bare CDN hostname. */
  previewOrigin: string;
}

export function generateWrapEntry(
  stage1Path: string,
  options: {
    windowCollector?: string;
    windowElb?: string;
    /**
     * Preview activation wiring. Only host (deploy) wraps set this: the
     * preview-artifact wrap always omits it, so an activated preview can
     * never re-verify its own grant and re-inject itself.
     */
    preview?: WrapEntryPreview;
    /**
     * Preview-ARTIFACT wiring (the third wrap variant). When set, the emitted
     * entry reads the session-forwarding grant from
     * `localStorage['elbPreviewSession']` (the companion slot the activator
     * persists alongside the activation grant) at boot and stamps it as the
     * `X-Walkeros-Preview` header on each named server-bound destination
     * (`config.destinations[k].config.settings.headers`), before `startFlow`.
     * The grant is never baked into the artifact.
     *
     * Mutually exclusive with `preview`: a host bundle ACTIVATES a preview, an
     * artifact INJECTS its grant. An artifact that also baked the activator
     * would re-verify the stored grant and re-inject itself (infinite
     * recursion), so setting both throws.
     */
    previewGrantTargets?: string[];
    /** Runtime platform. 'browser' emits env.window/env.document injection; 'node' omits it. Default 'browser' for backward compat. */
    platform?: 'browser' | 'node';
    /**
     * STATIC observe connect config baked onto the startFlow config. PUBLIC
     * values only (`url` + `binding`, plus optional `flowId`/`level`/`sample`
     * scoping); the runtime connect module reads the per-session credential
     * out-of-band at boot via the `elbObserve` slot. This is the
     * preview-artifact observation wiring: it bakes no ingest token.
     */
    observe?: ObserveWeb;
  } = {},
): string {
  const assignments: string[] = [];
  if (options.windowCollector) {
    assignments.push(
      `  if (typeof window !== 'undefined') window['${options.windowCollector}'] = collector;`,
    );
  }
  // windowElb is intentionally NOT assigned here (see generateWebEntry): the
  // browser source is the single writer of window[settings.elb].
  const assignmentCode =
    assignments.length > 0 ? '\n' + assignments.join('\n') : '';

  // A host bundle activates a preview; a preview artifact injects its grant.
  // Baking both would let an activated artifact re-verify the stored grant and
  // re-inject itself (infinite recursion), so refuse the combination loudly
  // rather than pick a silent precedence that hides a caller bug.
  if (
    options.preview !== undefined &&
    options.previewGrantTargets !== undefined
  ) {
    throw new Error(
      'generateWrapEntry: `preview` (host activator) and `previewGrantTargets` ' +
        '(preview-artifact injection) are mutually exclusive. A host bundle ' +
        'activates a preview; an artifact injects its grant. Pass at most one.',
    );
  }

  const preview = options.preview;
  const previewEnabled = !!preview?.enabled;

  // The activator is imported (not inlined) so its logic is tested as a module
  // and DCE keeps it out of every bundle that does not enable preview.
  const previewImport = previewEnabled
    ? `import { browserSwapActivator } from '@walkeros/core';\n`
    : '';

  // Preview-artifact variant: read the SESSION-FORWARDING grant (the
  // companion the activator persists to localStorage['elbPreviewSession'])
  // at boot and stamp it as the X-Walkeros-Preview header on each named
  // server-bound destination, before startFlow. Never the activation grant
  // in 'elbPreview': the session container only accepts session-bound
  // grants, so that value could only ever be rejected (sb-mismatch). The
  // grant value never appears as a literal — only the runtime localStorage
  // read. localStorage access is wrapped in try/catch (Safari private mode
  // throws) and an absent key skips injection entirely so a plain page
  // boots normally.
  const grantTargets = options.previewGrantTargets ?? [];
  const previewGrantBlock =
    grantTargets.length > 0
      ? `
  // --- Preview grant injection ---
  try {
    const __previewGrant =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('elbPreviewSession')
        : null;
    if (__previewGrant && config.destinations) {
${grantTargets
  .map((key) => {
    const ref = `config.destinations[${singleQuoteLiteral(key)}]`;
    return `      if (${ref}) {
        const __dest = ${ref};
        const __cfg = __dest.config || (__dest.config = {});
        const __settings = __cfg.settings || (__cfg.settings = {});
        const __headers = __settings.headers || (__settings.headers = {});
        __headers['X-Walkeros-Preview'] = __previewGrant;
      }`;
  })
  .join('\n')}
    }
  } catch (__err) {
    // localStorage can throw (Safari private mode); boot without the grant.
  }
  // --- End preview grant injection ---`
      : '';

  const previewBlock =
    previewEnabled && preview
      ? `
  // --- Preview activation ---
  if (await browserSwapActivator(${JSON.stringify({
    keyring: preview.keyring,
    iss: preview.iss,
    pb: preview.pb,
    acceptForeign: preview.acceptForeign,
    demoAllowlist: preview.demoAllowlist,
    previewOrigin: preview.previewOrigin,
  })})) return;
  // --- End preview activation ---
`
      : '';

  const platform = options.platform ?? 'browser';
  const envBlock =
    platform === 'browser'
      ? `
  if (config.sources) {
    for (const key of Object.keys(config.sources)) {
      const source = config.sources[key];
      if (!source) continue;
      const env = source.env ?? (source.env = {});
      env.window = env.window ?? (typeof window !== 'undefined' ? window : undefined);
      env.document = env.document ?? (typeof document !== 'undefined' ? document : undefined);
    }
  }`
      : '';

  const stage1Specifier = toFileImportSpecifier(stage1Path);

  // STATIC observe connect wiring (see emitObserveAssignment): baked inside
  // the IIFE AFTER the activator's early return, so an activated page (the
  // artifact swapped in) never also installs the host's connect module.
  const observeBlock = options.observe
    ? emitObserveAssignment(options.observe)
    : '';

  return `${previewImport}import { startFlow, wireConfig, __configData } from '${stage1Specifier}';

(async () => {${previewBlock}
  const config = wireConfig(__configData);${envBlock}${previewGrantBlock}${observeBlock}
  const { collector, elb } = await startFlow(config);${assignmentCode}
})();`;
}

/**
 * Emit a single-quoted JS string literal for a destination key. Destination
 * keys come from a validated flow config, but escaping backslash and single
 * quote keeps the emitted codegen well-formed for any key and matches the
 * single-quote convention the preview-injection tests pin.
 */
function singleQuoteLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Generate a stage 2 entry file for wrapping a node skeleton.
 *
 * Mirrors `generateServerEntry` but imports `__configData` from the skeleton
 * instead of inlining it. Output is a default-export factory module matching
 * the runner contract at `runtime/load-bundle.ts:53-66`: `module.default` is
 * an async function that takes a context and returns
 * `{ collector, elb, httpHandler? }`.
 */
export function generateWrapEntryServer(stage1Path: string): string {
  const stage1Specifier = toFileImportSpecifier(stage1Path);
  return `import { startFlow, wireConfig, __configData } from '${stage1Specifier}';

export default async function(context = {}) {
  const config = wireConfig(__configData);

  if (context.logger) config.logger = context.logger;

  if (context.sourceSettings && config.sources) {
    for (const src of Object.values(config.sources)) {
      if (src.config?.settings) {
        src.config.settings = { ...src.config.settings, ...context.sourceSettings };
      }
    }
  }

  const result = await startFlow(config);

  // Telemetry observer installation: the host (pipeline.ts) builds the
  // observer functions via createTelemetryObserver + createBatchedPoster
  // and forwards them through context. Added to collector.observers so the
  // runtime self-emission loop drives them.
  if (context.observers) {
    for (const observer of context.observers) {
      result.collector.observers.add(observer);
    }
  }

  // The host forwards the level supplier beside the observers; the collector
  // capture path reads it to decide destination call capture at trace.
  if (context.observeLevel) result.collector.observeLevel = context.observeLevel;

  const httpSource = Object.values(result.collector.sources || {})
    .find(s => 'httpHandler' in s && typeof s.httpHandler === 'function');

  return { ...result, httpHandler: httpSource ? httpSource.httpHandler : undefined };
}`;
}

/**
 * Process config value for serialization.
 * Handles $code: prefix to output raw JavaScript instead of quoted strings.
 */
function processConfigValue(value: unknown): string {
  return serializeWithCode(value, 0);
}

/**
 * Serialize a value, handling $code: prefix for inline JavaScript.
 * Values starting with "$code:" are output as raw JS (no quotes).
 */
export function serializeWithCode(value: unknown, indent: number): string {
  const spaces = '  '.repeat(indent);
  const nextSpaces = '  '.repeat(indent + 1);

  // Handle $code: and $store. prefixes - output raw JavaScript
  if (typeof value === 'string') {
    if (value.startsWith('$store.')) {
      const storeId = value.slice(7);
      return `stores.${storeId}`;
    }

    if (value.startsWith('$code:')) {
      return value.slice(6); // Strip prefix, output raw JS
    }

    // Deferred secret markers → guarded process.env read. The secret marker is
    // ALWAYS a whole-string value (never embedded inline), so we match the full
    // string. We wrap the read in __walkerosRequireSecret so an absent or empty
    // secret fails with a clear key-only error at startup instead of surfacing
    // later as a cryptic downstream failure (e.g. GCP ADC metadata lookup). The
    // secret VALUE is never inlined — only the env read + guard are emitted.
    if (value.startsWith(SECRET_MARKER_PREFIX)) {
      const name = value.slice(SECRET_MARKER_PREFIX.length);
      return `__walkerosRequireSecret(${JSON.stringify(name)}, process.env[${JSON.stringify(name)}])`;
    }

    // Deferred env markers → raw process.env expressions in bundle output
    // The marker regex uses a negative lookahead (?!__WALKEROS_ENV) to stop
    // the default value capture BEFORE the next marker prefix. Without this,
    // `__WALKEROS_ENV:A://__WALKEROS_ENV:B` would be parsed as one marker
    // with A's default consuming the entire rest of the string.
    const esc = ENV_MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const markerRe = new RegExp(
      esc +
        '([a-zA-Z_][a-zA-Z0-9_]*)' +
        '(?::(' +
        '(?:(?!' +
        esc +
        ')[^\\s"\'])' +
        '*))?',
      'g',
    );

    if (markerRe.test(value)) {
      markerRe.lastIndex = 0; // reset after test()

      // Pure marker (entire string is one marker)
      const pureRe = new RegExp(
        '^' +
          esc +
          '([a-zA-Z_][a-zA-Z0-9_]*)' +
          '(?::(' +
          '(?:(?!' +
          esc +
          ')[^\\s"\'])' +
          '*))?$',
      );
      const pureMatch = value.match(pureRe);
      if (pureMatch) {
        const [, name, defaultValue] = pureMatch;
        return defaultValue !== undefined
          ? `process.env[${JSON.stringify(name)}] ?? ${JSON.stringify(defaultValue)}`
          : `process.env[${JSON.stringify(name)}]`;
      }

      // Mixed content → template literal
      // Escape backticks and non-interpolation $ in static parts to prevent
      // broken/exploitable template literals (e.g. "Price is $5" → "$5" would
      // be interpreted as ${5} without escaping).
      const segments: string[] = [];
      let lastIndex = 0;
      markerRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = markerRe.exec(value)) !== null) {
        // Static text before this marker — escape ` and $
        const staticPart = value
          .slice(lastIndex, m.index)
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`')
          .replace(/\$(?!{)/g, '\\$');
        const [, name, defaultValue] = m;
        const envExpr =
          defaultValue !== undefined
            ? `\${process.env[${JSON.stringify(name)}] ?? ${JSON.stringify(defaultValue)}}`
            : `\${process.env[${JSON.stringify(name)}]}`;
        segments.push(staticPart + envExpr);
        lastIndex = m.index + m[0].length;
      }
      // Trailing static text
      const trailing = value
        .slice(lastIndex)
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$(?!{)/g, '\\$');
      segments.push(trailing);
      return '`' + segments.join('') + '`';
    }

    return JSON.stringify(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(
      (v) => nextSpaces + serializeWithCode(v, indent + 1),
    );
    return `[\n${items.join(',\n')}\n${spaces}]`;
  }

  // Handle objects
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const props = entries.map(
      ([k, v]) =>
        `${nextSpaces}${JSON.stringify(k)}: ${serializeWithCode(v, indent + 1)}`,
    );
    return `{\n${props.join(',\n')}\n${spaces}}`;
  }

  // Handle primitives (numbers, booleans, null)
  return JSON.stringify(value);
}
