import crypto from 'crypto';
import esbuild from 'esbuild';
import { builtinModules } from 'module';
import path from 'path';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import { packageNameToVariable, ENV_MARKER_PREFIX } from '@walkeros/core';
import {
  classifyStepProperties,
  containsCodeMarkers,
} from './config-classifier.js';

/**
 * Type guard to check if a code value is an InlineCode object.
 * InlineCode has { push: string, type?: string, init?: string }
 */
function isInlineCode(code: unknown): code is Flow.InlineCode {
  return (
    code !== null &&
    typeof code === 'object' &&
    !Array.isArray(code) &&
    'push' in code
  );
}

/**
 * Validates that a reference has either package XOR code, not both or neither.
 * Throws descriptive error for invalid configurations.
 */
function hasCodeReference(code: unknown): boolean {
  return isInlineCode(code) || typeof code === 'string';
}

function validateReference(
  type: string,
  name: string,
  ref: { package?: string; code?: unknown },
): void {
  const hasPackage = !!ref.package;
  const hasInlineCode = isInlineCode(ref.code);
  const hasCode = hasCodeReference(ref.code);

  // Inline code object + package is invalid (ambiguous)
  if (hasPackage && hasInlineCode) {
    throw new Error(
      `${type} "${name}": Cannot specify both package and code. Use one or the other.`,
    );
  }
  // String code + package is valid (named import from package)
  // Neither package nor code is invalid
  if (!hasPackage && !hasCode) {
    throw new Error(`${type} "${name}": Must specify either package or code.`);
  }
}

/**
 * Generates inline code for any component type (source, destination, transformer).
 * Handles $code: prefix for push/init functions.
 *
 * @param inline - InlineCode object with push, optional init, optional type
 * @param config - Component configuration
 * @param env - Optional environment configuration
 * @param chain - Optional chain value (next for sources/transformers, before for destinations)
 * @param chainPropertyName - Name of chain property in output ('next' | 'before')
 * @param isDestination - Whether this is a destination (uses different code structure)
 */
function generateInlineCode(
  inline: Flow.InlineCode,
  config: object,
  env?: object,
  chain?: string | string[],
  chainPropertyName?: 'next' | 'before',
  isDestination?: boolean,
): string {
  const pushFn = inline.push.replace('$code:', '');
  const initFn = inline.init ? inline.init.replace('$code:', '') : undefined;
  const typeLine = inline.type ? `type: '${inline.type}',` : '';
  const chainLine =
    chain && chainPropertyName
      ? `${chainPropertyName}: ${JSON.stringify(chain)},`
      : '';

  // Destinations have a different structure - code is the instance directly
  if (isDestination) {
    return `{
      code: {
        ${typeLine}
        config: ${JSON.stringify(config || {})},
        ${initFn ? `init: ${initFn},` : ''}
        push: ${pushFn}
      },
      config: ${JSON.stringify(config || {})},
      env: ${JSON.stringify(env || {})}${
        chain
          ? `,
      ${chainLine.slice(0, -1)}`
          : ''
      }
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
      config: ${JSON.stringify(config || {})},
      env: ${JSON.stringify(env || {})}${
        chain
          ? `,
      ${chainLine.slice(0, -1)}`
          : ''
      }
    }`;
}
import type { BuildOptions } from '../../types/bundle.js';
import { downloadPackages } from './package-manager.js';
import type { Logger } from '@walkeros/core';
import { getTmpPath } from '../../core/tmp.js';
import {
  isBuildCached,
  getCachedBuild,
  cacheBuild,
  getCachedCode,
  cacheCode,
  ensureCodeOnDisk,
} from '../../core/build-cache.js';

export interface BundleStats {
  totalSize: number;
  packages: { name: string; size: number }[];
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
 */
function generateCacheKeyContent(
  flowSettings: Flow.Settings,
  buildOptions: BuildOptions,
): string {
  const configForCache = {
    flow: flowSettings,
    build: {
      ...buildOptions,
      // Exclude non-deterministic fields from cache key
      tempDir: undefined,
      output: undefined,
    },
  };
  return JSON.stringify(configForCache);
}

/**
 * Validates flow config and warns about deprecated features.
 * Returns true if there are any issues that should stop the build.
 *
 * Note: We use (code as unknown) === true to check for deprecated code: true
 * because the type no longer includes true, but runtime values may still have it.
 */
function validateFlowConfig(
  flowSettings: Flow.Settings,
  logger: Logger.Instance,
): boolean {
  let hasDeprecatedCodeTrue = false;

  // Check sources for code: true (deprecated, removed from types)
  const sources = flowSettings.sources || {};
  for (const [sourceId, source] of Object.entries(sources)) {
    if (
      source &&
      typeof source === 'object' &&
      (source.code as unknown) === true
    ) {
      logger.warn(
        `DEPRECATED: Source "${sourceId}" uses code: true which is no longer supported. ` +
          `Use $code: prefix in config values or create a source package instead.`,
      );
      hasDeprecatedCodeTrue = true;
    }
  }

  // Check destinations for code: true (deprecated, removed from types)
  const destinations = flowSettings.destinations || {};
  for (const [destId, dest] of Object.entries(destinations)) {
    if (dest && typeof dest === 'object' && (dest.code as unknown) === true) {
      logger.warn(
        `DEPRECATED: Destination "${destId}" uses code: true which is no longer supported. ` +
          `Use $code: prefix in config values or create a destination package instead.`,
      );
      hasDeprecatedCodeTrue = true;
    }
  }

  // Check transformers for code: true (deprecated, removed from types)
  const transformers = flowSettings.transformers || {};
  for (const [transformerId, transformer] of Object.entries(transformers)) {
    if (
      transformer &&
      typeof transformer === 'object' &&
      (transformer.code as unknown) === true
    ) {
      logger.warn(
        `DEPRECATED: Transformer "${transformerId}" uses code: true which is no longer supported. ` +
          `Use $code: prefix in config values or create a transformer package instead.`,
      );
      hasDeprecatedCodeTrue = true;
    }
  }

  if (hasDeprecatedCodeTrue) {
    logger.warn(
      `See https://www.elbwalker.com/docs/walkeros/getting-started/flow for migration guide.`,
    );
  }

  return hasDeprecatedCodeTrue;
}

export async function bundleCore(
  flowSettings: Flow.Settings,
  buildOptions: BuildOptions,
  logger: Logger.Instance,
  showStats = false,
): Promise<BundleStats | void> {
  const bundleStartTime = Date.now();

  // Validate flow config and warn about deprecated features
  const hasDeprecatedFeatures = validateFlowConfig(flowSettings, logger);
  if (hasDeprecatedFeatures) {
    logger.warn('Skipping deprecated code: true entries from bundle.');
  }

  // Per-build isolation: unique working dir, shared cache
  const buildId = crypto.randomUUID();
  const TEMP_DIR =
    buildOptions.tempDir || getTmpPath(undefined, `walkeros-build-${buildId}`);
  const CACHE_DIR = buildOptions.tempDir || getTmpPath();

  // Check build cache if caching is enabled
  if (buildOptions.cache !== false) {
    const configContent = generateCacheKeyContent(flowSettings, buildOptions);

    const cached = await isBuildCached(configContent, CACHE_DIR);
    if (cached) {
      const cachedBuild = await getCachedBuild(configContent, CACHE_DIR);
      if (cachedBuild) {
        logger.debug('Using cached build');

        // Write cached build to output
        const outputPath = path.resolve(buildOptions.output);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, cachedBuild);

        const stats = await fs.stat(outputPath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        logger.info(`Output: ${outputPath} (${sizeKB} KB, cached)`);

        // Return stats if requested
        if (showStats) {
          const stats = await fs.stat(outputPath);
          // Generate basic package stats from buildOptions
          const packageStats = Object.entries(buildOptions.packages).map(
            ([name, pkg]) => ({
              name: `${name}@${pkg.version || 'latest'}`,
              size: 0, // Size estimation not available for cached builds
            }),
          );
          // Check user code for wildcard imports (same logic as collectBundleStats)
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

  try {
    // Step 1: Ensure temporary directory exists
    await fs.ensureDir(TEMP_DIR);

    // Step 1.5: Auto-add collector if sources/destinations exist but collector not specified
    const hasSourcesOrDests =
      Object.keys(
        (flowSettings as unknown as { sources?: Record<string, unknown> })
          .sources || {},
      ).length > 0 ||
      Object.keys(
        (flowSettings as unknown as { destinations?: Record<string, unknown> })
          .destinations || {},
      ).length > 0;

    if (hasSourcesOrDests && !buildOptions.packages['@walkeros/collector']) {
      buildOptions.packages['@walkeros/collector'] = {};
    }

    // Step 1.6: Auto-add step packages (sources, destinations, transformers, stores)
    const stepPackages = collectAllStepPackages(flowSettings);
    for (const pkg of stepPackages) {
      const isLocalPath = pkg.startsWith('.') || pkg.startsWith('/');

      if (isLocalPath) {
        // Normalize: convert path-based package: to packages section entry
        // This reuses the existing local-path import machinery
        const varName = packageNameToVariable(pkg);
        if (!buildOptions.packages[varName]) {
          buildOptions.packages[varName] = {
            path: pkg,
            imports: [`default as ${varName}`],
          };
        }

        // Rewrite all components that reference this path to use code: instead
        for (const section of [
          'sources',
          'destinations',
          'transformers',
          'stores',
        ] as const) {
          const steps = (
            flowSettings as Record<
              string,
              Record<string, Record<string, unknown>>
            >
          )[section];
          if (!steps) continue;
          for (const step of Object.values(steps)) {
            if (step.package === pkg) {
              step.code = varName;
              delete step.package;
            }
          }
        }
      } else if (!buildOptions.packages[pkg]) {
        buildOptions.packages[pkg] = {};
      }
    }

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
    // downloadPackages adds 'node_modules' subdirectory automatically
    const packagePaths = await downloadPackages(
      packagesArray,
      TEMP_DIR,
      logger,
      buildOptions.cache,
      buildOptions.configDir, // For resolving relative local paths
      CACHE_DIR,
      buildOptions.overrides,
    );

    // Fix @walkeros packages to have proper ESM exports
    // This ensures Node resolves to .mjs files instead of .js (CJS)
    for (const [pkgName, pkgPath] of packagePaths.entries()) {
      if (pkgName.startsWith('@walkeros/')) {
        const pkgJsonPath = path.join(pkgPath, 'package.json');
        const pkgJson = await fs.readJSON(pkgJsonPath);

        // Add exports field to force ESM resolution
        if (!pkgJson.exports && pkgJson.module) {
          pkgJson.exports = {
            '.': {
              import: pkgJson.module,
              require: pkgJson.main,
            },
          };
          await fs.writeJSON(pkgJsonPath, pkgJson, { spaces: 2 });
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
    const { codeEntry, dataPayload, hasFlow } = await createEntryPoint(
      flowSettings,
      buildOptions,
      packagePaths,
    );

    const outputPath = path.resolve(buildOptions.output);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // === LEVEL 2: Two-phase build (code cache) ===
    // Check if we have a cached compilation of this exact code entry
    let compiledCode: string | null = null;
    if (buildOptions.cache !== false) {
      compiledCode = await getCachedCode(codeEntry, CACHE_DIR);
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
        await cacheCode(codeEntry, compiledCode, CACHE_DIR);
      }
    }

    // Write stage 1 output to cache as importable .mjs file
    const stage1Path = await ensureCodeOnDisk(
      codeEntry,
      compiledCode,
      CACHE_DIR,
    );

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
      // Production path: stage 2 esbuild compilation
      const stage2Entry =
        (buildOptions.platform || 'node') === 'browser'
          ? generateWebEntry(stage1Path, dataPayload, {
              windowCollector: buildOptions.windowCollector,
              windowElb: buildOptions.windowElb,
              platform: buildOptions.platform as 'browser' | 'node',
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
        stage2Options.define = {
          'process.env.NODE_ENV': '"production"',
          global: 'globalThis',
        };
        stage2Options.target = buildOptions.target || 'es2018';
      } else {
        stage2Options.external = getNodeExternals();
        stage2Options.banner = {
          js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
        };
        stage2Options.target = buildOptions.target || 'node18';
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
      const configContent = generateCacheKeyContent(flowSettings, buildOptions);
      const buildOutput = await fs.readFile(outputPath, 'utf-8');
      await cacheBuild(configContent, buildOutput, CACHE_DIR);
      logger.debug('Build cached for future use');
    }

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

  // Estimate package sizes by analyzing imports in entry content
  const packageStats = Object.entries(packages).map(([name, pkg]) => {
    const importPattern = new RegExp(`from\\s+['"]${name}['"]`, 'g');
    const namedImportPattern = new RegExp(
      `import\\s+\\{[^}]*\\}\\s+from\\s+['"]${name}['"]`,
      'g',
    );
    const hasImports =
      importPattern.test(entryContent) || namedImportPattern.test(entryContent);

    // Rough estimation: if package is imported, assign proportional size
    const packagesCount = Object.keys(packages).length;
    const estimatedSize = hasImports
      ? Math.floor(totalSize / packagesCount)
      : 0;

    return {
      name: `${name}@${pkg.version || 'latest'}`,
      size: estimatedSize,
    };
  });

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

function createEsbuildOptions(
  buildOptions: BuildOptions,
  entryPath: string,
  outputPath: string,
  tempDir: string,
  packagePaths: Map<string, string>,
  logger: Logger.Instance,
): esbuild.BuildOptions {
  // Don't use aliases - they cause esbuild to bundle even external packages
  // Instead, use absWorkingDir to point to temp directory where node_modules is
  const alias: Record<string, string> = {};

  const baseOptions: esbuild.BuildOptions = {
    entryPoints: [entryPath],
    bundle: true,
    format: 'esm' as esbuild.Format, // Always ESM — platform wrapper handles final format
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
    // For browser bundles, let users handle Node.js built-ins as needed
    baseOptions.external = buildOptions.external || [];
  } else if (buildOptions.platform === 'node') {
    // Only Node.js built-ins are external — everything else gets bundled.
    // This makes server bundles self-contained (no node_modules needed at runtime).
    const nodeExternals = getNodeExternals();
    baseOptions.external = buildOptions.external
      ? [...nodeExternals, ...buildOptions.external]
      : nodeExternals;

    // createRequire shim is added in stage 2, not here.
    // Stage 1 produces importable ESM; stage 2 wraps it with the banner.
  }

  // Set target if specified
  if (buildOptions.target) {
    baseOptions.target = buildOptions.target;
  } else if (buildOptions.platform === 'node') {
    baseOptions.target = 'node18';
  } else {
    baseOptions.target = 'es2018';
  }

  return baseOptions;
}

/**
 * Detects destination packages from flow configuration.
 * Extracts package names from destinations that have explicit 'package' field.
 */
/**
 * Detects packages from a flow config section (sources, destinations, transformers, stores).
 * Extracts package names from steps that have an explicit 'package' field.
 * Skips steps with code: true (inline code).
 */
export function detectStepPackages(
  flowSettings: Flow.Settings,
  section: 'sources' | 'destinations' | 'transformers' | 'stores',
): Set<string> {
  const packages = new Set<string>();
  const steps = (
    flowSettings as unknown as {
      [key: string]: Record<string, unknown> | undefined;
    }
  )[section];

  if (steps) {
    for (const [, stepConfig] of Object.entries(steps)) {
      if (typeof stepConfig !== 'object' || stepConfig === null) continue;
      // Skip if code: true (uses built-in inline code)
      if ('code' in stepConfig && stepConfig.code === true) continue;
      // Require explicit package field
      if ('package' in stepConfig && typeof stepConfig.package === 'string') {
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
 * Collects all package names declared in flow steps.
 * Returns both npm packages and local paths — caller handles routing.
 */
export function collectAllStepPackages(
  flowSettings: Flow.Settings,
): Set<string> {
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
 * Detects explicit code imports from destinations, sources, and transformers.
 * Returns a map of package names to sets of export names.
 */
export function detectExplicitCodeImports(
  flowSettings: Flow.Settings,
): Map<string, Set<string>> {
  const explicitCodeImports = new Map<string, Set<string>>();

  // Check destinations
  const destinations = (
    flowSettings as unknown as { destinations?: Record<string, unknown> }
  ).destinations;

  if (destinations) {
    for (const [destKey, destConfig] of Object.entries(destinations)) {
      // Skip code: true (built-in inline code)
      if (
        typeof destConfig === 'object' &&
        destConfig !== null &&
        'code' in destConfig &&
        destConfig.code === true
      ) {
        continue;
      }
      if (
        typeof destConfig === 'object' &&
        destConfig !== null &&
        'package' in destConfig &&
        typeof destConfig.package === 'string' &&
        'code' in destConfig &&
        typeof destConfig.code === 'string'
      ) {
        // Only treat as explicit if code doesn't match auto-generated pattern
        // Auto-generated code starts with '_' (from packageNameToVariable)
        const isAutoGenerated = destConfig.code.startsWith('_');
        if (!isAutoGenerated) {
          if (!explicitCodeImports.has(destConfig.package)) {
            explicitCodeImports.set(destConfig.package, new Set());
          }
          explicitCodeImports.get(destConfig.package)!.add(destConfig.code);
        }
      }
    }
  }

  // Check sources
  const sources = (
    flowSettings as unknown as { sources?: Record<string, unknown> }
  ).sources;

  if (sources) {
    for (const [sourceKey, sourceConfig] of Object.entries(sources)) {
      // Skip code: true (built-in inline code)
      if (
        typeof sourceConfig === 'object' &&
        sourceConfig !== null &&
        'code' in sourceConfig &&
        sourceConfig.code === true
      ) {
        continue;
      }
      if (
        typeof sourceConfig === 'object' &&
        sourceConfig !== null &&
        'package' in sourceConfig &&
        typeof sourceConfig.package === 'string' &&
        'code' in sourceConfig &&
        typeof sourceConfig.code === 'string'
      ) {
        // Only treat as explicit if code doesn't match auto-generated pattern
        // Auto-generated code starts with '_' (from packageNameToVariable)
        const isAutoGenerated = sourceConfig.code.startsWith('_');
        if (!isAutoGenerated) {
          if (!explicitCodeImports.has(sourceConfig.package)) {
            explicitCodeImports.set(sourceConfig.package, new Set());
          }
          explicitCodeImports.get(sourceConfig.package)!.add(sourceConfig.code);
        }
      }
    }
  }

  // Check transformers
  const transformers = (
    flowSettings as unknown as { transformers?: Record<string, unknown> }
  ).transformers;

  if (transformers) {
    for (const [transformerKey, transformerConfig] of Object.entries(
      transformers,
    )) {
      // Skip code: true (built-in inline code)
      if (
        typeof transformerConfig === 'object' &&
        transformerConfig !== null &&
        'code' in transformerConfig &&
        transformerConfig.code === true
      ) {
        continue;
      }
      if (
        typeof transformerConfig === 'object' &&
        transformerConfig !== null &&
        'package' in transformerConfig &&
        typeof transformerConfig.package === 'string' &&
        'code' in transformerConfig &&
        typeof transformerConfig.code === 'string'
      ) {
        // Only treat as explicit if code doesn't match auto-generated pattern
        const isAutoGenerated = transformerConfig.code.startsWith('_');
        if (!isAutoGenerated) {
          if (!explicitCodeImports.has(transformerConfig.package)) {
            explicitCodeImports.set(transformerConfig.package, new Set());
          }
          explicitCodeImports
            .get(transformerConfig.package)!
            .add(transformerConfig.code);
        }
      }
    }
  }

  // Check stores
  const stores = (
    flowSettings as unknown as { stores?: Record<string, unknown> }
  ).stores;

  if (stores) {
    for (const [, storeConfig] of Object.entries(stores)) {
      if (
        typeof storeConfig === 'object' &&
        storeConfig !== null &&
        'package' in storeConfig &&
        typeof storeConfig.package === 'string' &&
        'code' in storeConfig &&
        typeof storeConfig.code === 'string'
      ) {
        const isAutoGenerated = storeConfig.code.startsWith('_');
        if (!isAutoGenerated) {
          if (!explicitCodeImports.has(storeConfig.package)) {
            explicitCodeImports.set(storeConfig.package, new Set());
          }
          explicitCodeImports.get(storeConfig.package)!.add(storeConfig.code);
        }
      }
    }
  }

  return explicitCodeImports;
}

interface ImportGenerationResult {
  importStatements: string[];
  devExportEntries: string[];
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
  explicitCodeImports: Map<string, Set<string>>,
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
    const hasExplicitCode = explicitCodeImports.has(packageName);

    // Track what named imports we'll generate to avoid duplicates
    const namedImportsToGenerate: string[] = [];

    // 1. Generate default import for packages used by sources/destinations
    //    UNLESS explicit code is specified (allows packages without default export)
    if (isUsedByDestOrSource && !hasExplicitCode) {
      const varName = packageNameToVariable(packageName);
      importStatements.push(`import ${varName} from '${packageName}';`);
    }

    // 2. Generate named import for explicit code (packages without default export)
    if (hasExplicitCode) {
      const codes = Array.from(explicitCodeImports.get(packageName)!);
      namedImportsToGenerate.push(...codes);
    }

    // 3. Process imports list (utilities and special syntax)
    if (packageConfig.imports && packageConfig.imports.length > 0) {
      const uniqueImports = [...new Set(packageConfig.imports)];

      // Handle special "default as X" syntax
      for (const imp of uniqueImports) {
        if (imp.startsWith('default as ')) {
          // Only generate default import if not already generated above
          if (!isUsedByDestOrSource || hasExplicitCode) {
            const defaultImportName = imp.replace('default as ', '');
            importStatements.push(
              `import ${defaultImportName} from '${packageName}';`,
            );
          }
        } else {
          // Add to named imports if not already in explicit code
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

  // Generate /dev imports for packages that expose a ./dev export.
  // Only emitted when withDev is true (i.e., skipWrapper bundles consumed by
  // push/simulate/flow-context). Production IIFE bundles skip this entirely —
  // otherwise the dev graph (zod schemas, etc.) leaks into walker.js because
  // stage 2 esbuild cannot tree-shake transitive imports out of the already-
  // concatenated stage 1 file.
  const devExportEntries: string[] = [];
  if (withDev) {
    for (const packageName of usedPackages) {
      const localPath = packagePaths.get(packageName);
      if (!localPath) continue;

      try {
        const pkgJsonPath = path.join(localPath, 'package.json');
        const pkgJson = await fs.readJSON(pkgJsonPath);
        const exports = pkgJson.exports;
        if (exports && typeof exports === 'object' && './dev' in exports) {
          const varName = `__dev_${packageNameToVariable(packageName)}`;
          importStatements.push(
            `import * as ${varName} from '${packageName}/dev';`,
          );
          devExportEntries.push(`'${packageName}': ${varName}`);
        }
      } catch {
        // Package doesn't have a readable package.json — skip gracefully
      }
    }
  }

  return { importStatements, devExportEntries };
}

const VALID_JS_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * Validates that component names are valid JavaScript identifiers.
 * The bundler generates JS where flow config keys become property names,
 * so keys like "gtag-wrapper" would cause esbuild syntax errors.
 * Catches this early with a helpful error message suggesting camelCase.
 */
export function validateComponentNames(
  components: Record<string, unknown>,
  section: string,
): void {
  for (const name of Object.keys(components)) {
    if (!VALID_JS_IDENTIFIER.test(name)) {
      throw new Error(
        `Invalid ${section} name "${name}": must be a valid JavaScript identifier (use camelCase, e.g., "${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}")`,
      );
    }
  }
}

/**
 * Validates all $store: references point to defined stores.
 * Throws descriptive error on mismatch.
 */
function validateStoreReferences(
  flowSettings: Flow.Settings,
  storeIds: Set<string>,
): void {
  const refs: Array<{ ref: string; location: string }> = [];

  function collectRefs(obj: unknown, path: string) {
    if (typeof obj === 'string' && obj.startsWith('$store:')) {
      refs.push({ ref: obj.slice(7), location: path });
    } else if (obj && typeof obj === 'object') {
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        collectRefs(val, `${path}.${key}`);
      }
    }
  }

  // Scan all component env/config values
  for (const [section, components] of Object.entries({
    sources: flowSettings.sources || {},
    destinations: flowSettings.destinations || {},
    transformers: flowSettings.transformers || {},
  })) {
    for (const [id, component] of Object.entries(
      components as Record<string, Record<string, unknown>>,
    )) {
      collectRefs(component, `${section}.${id}`);
    }
  }

  for (const { ref, location } of refs) {
    if (!storeIds.has(ref)) {
      const available =
        storeIds.size > 0
          ? `Available stores: ${Array.from(storeIds).join(', ')}`
          : 'No stores defined';
      throw new Error(
        `Store reference "$store:${ref}" in ${location} — store "${ref}" not found. ${available}`,
      );
    }
  }
}

/**
 * Creates the entry point code for the bundle.
 * Generates imports, config object, and platform-specific wrapper programmatically.
 */
export async function createEntryPoint(
  flowSettings: Flow.Settings,
  buildOptions: BuildOptions,
  packagePaths: Map<string, string>,
): Promise<{ codeEntry: string; dataPayload: string; hasFlow: boolean }> {
  // Detect packages used by all step types
  const sourcePackages = detectStepPackages(flowSettings, 'sources');
  const destinationPackages = detectStepPackages(flowSettings, 'destinations');
  const transformerPackages = detectStepPackages(flowSettings, 'transformers');
  const storePackages = detectStepPackages(flowSettings, 'stores');
  const explicitCodeImports = detectExplicitCodeImports(flowSettings);

  // Validate $store: references before code generation
  const storeIds = new Set(
    Object.keys(
      (flowSettings as unknown as { stores?: Record<string, unknown> })
        .stores || {},
    ),
  );
  validateStoreReferences(flowSettings, storeIds);

  // Validate component names are valid JS identifiers (they become property names in generated code)
  const flowWithSections = flowSettings as unknown as {
    sources?: Record<string, unknown>;
    destinations?: Record<string, unknown>;
    transformers?: Record<string, unknown>;
    stores?: Record<string, unknown>;
  };
  if (flowWithSections.sources)
    validateComponentNames(flowWithSections.sources, 'sources');
  if (flowWithSections.destinations)
    validateComponentNames(flowWithSections.destinations, 'destinations');
  if (flowWithSections.transformers)
    validateComponentNames(flowWithSections.transformers, 'transformers');
  if (flowWithSections.stores)
    validateComponentNames(flowWithSections.stores, 'stores');

  // Generate import statements.
  // withDev is resolved from the BundleTarget preset by the public `bundle()`
  // entry point. When called directly via `bundleCore` (push, simulate, tests),
  // we fall back to `skipWrapper === true` for backward compatibility — those
  // call sites historically relied on skipWrapper to pull in /dev schemas.
  const withDev =
    buildOptions.withDev !== undefined
      ? buildOptions.withDev === true
      : buildOptions.skipWrapper === true;
  const { importStatements, devExportEntries } = await generateImportStatements(
    buildOptions.packages,
    destinationPackages,
    sourcePackages,
    transformerPackages,
    storePackages,
    explicitCodeImports,
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
    };
  }

  // Build split config object (code skeleton + data payload)
  const { storesDeclaration, codeConfigObject, dataPayload } =
    buildSplitConfigObject(flowSettings, explicitCodeImports);

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

  return { codeEntry, dataPayload, hasFlow: true };
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
 * Build split config object from flow configuration.
 * Produces TWO outputs:
 * - codeConfigObject: skeleton with code references and __data.* placeholders
 * - dataPayload: plain JSON-serializable object with settings, mappings, etc.
 *
 * Inline code steps bypass classification and go entirely to the code skeleton.
 * Package-based steps are split via classifyStepProperties.
 */
export function buildSplitConfigObject(
  flowSettings: Flow.Settings,
  explicitCodeImports: Map<string, Set<string>>,
): {
  storesDeclaration: string;
  codeConfigObject: string;
  dataPayload: string;
} {
  const flowWithProps = flowSettings as unknown as {
    sources?: Record<
      string,
      {
        package?: string;
        code?: string | true;
        config?: unknown;
        env?: unknown;
        before?: string | string[];
        next?: string | string[] | Array<{ match: unknown; next: unknown }>;
        cache?: unknown;
        primary?: boolean;
      }
    >;
    destinations?: Record<
      string,
      {
        package?: string;
        code?: string | true;
        config?: unknown;
        env?: unknown;
        before?: string | string[];
        next?: string | string[];
        cache?: unknown;
      }
    >;
    transformers?: Record<
      string,
      {
        package?: string;
        code?: string | true;
        config?: unknown;
        env?: unknown;
        before?: string | string[];
        next?: string;
        cache?: unknown;
      }
    >;
    stores?: Record<
      string,
      {
        package?: string;
        code?: string | true;
        config?: unknown;
        env?: unknown;
      }
    >;
    collector?: unknown;
  };

  const sources = flowWithProps.sources || {};
  const destinations = flowWithProps.destinations || {};
  const transformers = flowWithProps.transformers || {};
  const stores = flowWithProps.stores || {};

  // Data payload accumulator
  const dataPayloadObj: Record<string, Record<string, unknown>> = {};

  // Helper to resolve the code variable for a package-based step
  function resolveCodeVar(step: {
    package?: string;
    code?: string | true;
  }): string {
    // String code without package = named import from packages section
    if (step.code && typeof step.code === 'string' && !step.package) {
      return step.code;
    }
    if (
      step.code &&
      typeof step.code === 'string' &&
      step.package &&
      explicitCodeImports.has(step.package)
    ) {
      return step.code;
    }
    return packageNameToVariable(step.package!);
  }

  // Helper to build step properties (excluding 'code' and 'package')
  function getStepProps(
    step: Record<string, unknown>,
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(step)) {
      if (key === 'code' || key === 'package') continue;
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
    step: Record<string, unknown>,
  ): string {
    const codeVar = resolveCodeVar(
      step as { package?: string; code?: string | true },
    );
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

  // Validate references (skip deprecated code: true entries)
  Object.entries(sources).forEach(([name, source]) => {
    if ((source.code as unknown) !== true) {
      validateReference('Source', name, source);
    }
  });
  Object.entries(destinations).forEach(([name, dest]) => {
    if ((dest.code as unknown) !== true) {
      validateReference('Destination', name, dest);
    }
  });
  Object.entries(transformers).forEach(([name, transformer]) => {
    if ((transformer.code as unknown) !== true) {
      validateReference('Transformer', name, transformer);
    }
  });

  // Build sources
  const sourcesEntries = Object.entries(sources)
    .filter(
      ([, source]) =>
        (source.code as unknown) !== true &&
        (source.package || hasCodeReference(source.code)),
    )
    .map(([key, source]) => {
      if (isInlineCode(source.code)) {
        return `    ${key}: ${generateInlineCode(source.code, (source.config as object) || {}, source.env as object, source.next as string | string[] | undefined, 'next')}`;
      }
      return buildSplitStepEntry(
        'sources',
        key,
        source as Record<string, unknown>,
      );
    });

  // Build destinations
  const destinationsEntries = Object.entries(destinations)
    .filter(
      ([, dest]) =>
        (dest.code as unknown) !== true &&
        (dest.package || hasCodeReference(dest.code)),
    )
    .map(([key, dest]) => {
      if (isInlineCode(dest.code)) {
        return `    ${key}: ${generateInlineCode(dest.code, (dest.config as object) || {}, dest.env as object, dest.before, 'before', true)}`;
      }
      return buildSplitStepEntry(
        'destinations',
        key,
        dest as Record<string, unknown>,
      );
    });

  // Build transformers
  const transformersEntries = Object.entries(transformers)
    .filter(
      ([, transformer]) =>
        (transformer.code as unknown) !== true &&
        (transformer.package || hasCodeReference(transformer.code)),
    )
    .map(([key, transformer]) => {
      if (isInlineCode(transformer.code)) {
        return `    ${key}: ${generateInlineCode(transformer.code, (transformer.config as object) || {}, transformer.env as object, transformer.next, 'next')}`;
      }
      return buildSplitStepEntry(
        'transformers',
        key,
        transformer as Record<string, unknown>,
      );
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
      const storeProps = getStepProps(store as Record<string, unknown>);
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
  if (flowWithProps.collector) {
    if (containsCodeMarkers(flowWithProps.collector)) {
      // Collector has code markers — keep in code skeleton
      collectorStr = `,\n  ...${processConfigValue(flowWithProps.collector)}`;
    } else {
      // Plain collector — put in data payload
      dataPayloadObj['collector'] = flowWithProps.collector as Record<
        string,
        unknown
      >;
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

  return { storesDeclaration, codeConfigObject, dataPayload };
}

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

  return `export function wireConfig(__data) {
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
  return `import { startFlow, wireConfig } from '${stage1Path}';

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

  const httpSource = Object.values(result.collector.sources || {})
    .find(s => 'httpHandler' in s && typeof s.httpHandler === 'function');

  return { ...result, httpHandler: httpSource ? httpSource.httpHandler : undefined };
}`;
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
  } = {},
): string {
  const assignments: string[] = [];
  if (options.windowCollector) {
    assignments.push(
      `  if (typeof window !== 'undefined') window['${options.windowCollector}'] = collector;`,
    );
  }
  if (options.windowElb) {
    assignments.push(
      `  if (typeof window !== 'undefined') window['${options.windowElb}'] = elb;`,
    );
  }
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

  return `import { startFlow, wireConfig } from '${stage1Path}';

const __configData = ${dataPayload};

(async () => {
  const config = wireConfig(__configData);${envBlock}
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
export function generateWrapEntry(
  stage1Path: string,
  options: {
    windowCollector?: string;
    windowElb?: string;
    previewOrigin?: string;
    previewScope?: string;
    /** Runtime platform. 'browser' emits env.window/env.document injection; 'node' omits it. Default 'browser' for backward compat. */
    platform?: 'browser' | 'node';
  } = {},
): string {
  const assignments: string[] = [];
  if (options.windowCollector) {
    assignments.push(
      `  if (typeof window !== 'undefined') window['${options.windowCollector}'] = collector;`,
    );
  }
  if (options.windowElb) {
    assignments.push(
      `  if (typeof window !== 'undefined') window['${options.windowElb}'] = elb;`,
    );
  }
  const assignmentCode =
    assignments.length > 0 ? '\n' + assignments.join('\n') : '';

  const hasPreview = !!(options.previewOrigin && options.previewScope);
  const previewOriginLiteral = JSON.stringify(options.previewOrigin ?? '');
  const previewScopeLiteral = JSON.stringify(options.previewScope ?? '');

  const preflightBlock = hasPreview
    ? `
  // --- Preview mode preflight ---
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    var __previewOrigin = ${previewOriginLiteral};
    var __previewScope = ${previewScopeLiteral};
    var __params = new URLSearchParams(location.search);
    var __tokens = __params.getAll('elbPreview');
    var __param = __tokens.length > 0 ? __tokens[__tokens.length - 1] : null;
    var __secure = location.protocol === 'https:' ? '; Secure' : '';

    if (__param === 'off') {
      document.cookie = 'elbPreview=; path=/; max-age=0; SameSite=Lax' + __secure;
    } else if (__param && /^[a-zA-Z0-9_-]{8,32}$/.test(__param)) {
      document.cookie = 'elbPreview=' + __param + '; path=/; max-age=604800; SameSite=Lax' + __secure;
    }

    var __match = /(?:^|; )elbPreview=([^;]+)/.exec(document.cookie);
    var __token = __match && __match[1];
    if (__token && /^[a-zA-Z0-9_-]{8,32}$/.test(__token)) {
      var __previewSrc = 'https://' + __previewOrigin + '/preview/' + __previewScope + '/walker.' + __token + '.js';
      var __clearPreviewCookie = function () {
        document.cookie = 'elbPreview=; path=/; max-age=0; SameSite=Lax' + __secure;
      };
      try {
        // Bound the HEAD probe so a hung CDN can never block the production
        // walker. On abort/timeout we fall through to the catch branch and
        // self-heal by clearing the cookie.
        var __ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var __timeoutId = __ctrl ? setTimeout(function () { __ctrl.abort(); }, 2000) : null;
        var __probe = await fetch(__previewSrc, {
          method: 'HEAD',
          signal: __ctrl ? __ctrl.signal : undefined,
        });
        if (__timeoutId) clearTimeout(__timeoutId);
        if (__probe && __probe.ok) {
          var __s = document.createElement('script');
          __s.src = __previewSrc;
          document.head.appendChild(__s);
          return;
        }
        // Preview bundle missing (404/5xx) — self-heal by clearing cookie and
        // falling through to the production walker in this same bundle.
        __clearPreviewCookie();
      } catch (__err) {
        // Network error, timeout, or abort — fall through to production too.
        __clearPreviewCookie();
      }
    }
  }
  // --- End preview mode preflight ---
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

  return `import { startFlow, wireConfig, __configData } from '${stage1Path}';

(async () => {${preflightBlock}
  const config = wireConfig(__configData);${envBlock}
  const { collector, elb } = await startFlow(config);${assignmentCode}
})();`;
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
  return `import { startFlow, wireConfig, __configData } from '${stage1Path}';

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

  // Handle $code: and $store: prefixes - output raw JavaScript
  if (typeof value === 'string') {
    if (value.startsWith('$store:')) {
      const storeId = value.slice(7);
      return `stores.${storeId}`;
    }

    if (value.startsWith('$code:')) {
      return value.slice(6); // Strip prefix, output raw JS
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
