import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import { packageNameToVariable } from '@walkeros/core';
import type { BuildOptions } from '../../types/bundle.js';
import { downloadPackages } from './package-manager.js';
import type { Logger } from '../../core/index.js';
import { getTmpPath } from '../../core/tmp.js';
import {
  isBuildCached,
  getCachedBuild,
  cacheBuild,
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
async function copyIncludes(
  includes: string[],
  sourceDir: string,
  outputDir: string,
  logger: Logger,
): Promise<void> {
  for (const include of includes) {
    const sourcePath = path.resolve(sourceDir, include);
    const folderName = path.basename(include);
    const destPath = path.join(outputDir, folderName);

    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, destPath);
      logger.debug(`Copied ${include} to output`);
      // TODO: Add logging for copied folders
    } else {
      logger.debug(`Include folder not found: ${include}`);
      // TODO: Add logging for skipped folders (not found)
    }
  }
}

/**
 * Generate cache key content from flow config and build options.
 * Excludes non-deterministic fields (tempDir, output) from cache key.
 */
function generateCacheKeyContent(
  flowConfig: Flow.Config,
  buildOptions: BuildOptions,
): string {
  const configForCache = {
    flow: flowConfig,
    build: {
      ...buildOptions,
      // Exclude non-deterministic fields from cache key
      tempDir: undefined,
      output: undefined,
    },
  };
  return JSON.stringify(configForCache);
}

export async function bundleCore(
  flowConfig: Flow.Config,
  buildOptions: BuildOptions,
  logger: Logger,
  showStats = false,
): Promise<BundleStats | void> {
  const bundleStartTime = Date.now();
  // Use provided temp dir or default .tmp/
  const TEMP_DIR = buildOptions.tempDir || getTmpPath();

  // Check build cache if caching is enabled
  if (buildOptions.cache !== false) {
    const configContent = generateCacheKeyContent(flowConfig, buildOptions);

    const cached = await isBuildCached(configContent);
    if (cached) {
      const cachedBuild = await getCachedBuild(configContent);
      if (cachedBuild) {
        logger.debug('Using cached build');

        // Write cached build to output
        const outputPath = path.resolve(buildOptions.output);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, cachedBuild);

        const stats = await fs.stat(outputPath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        logger.log(`Output: ${outputPath} (${sizeKB} KB, cached)`);

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
          return {
            totalSize: stats.size,
            packages: packageStats,
            buildTime: Date.now() - bundleStartTime,
            treeshakingEffective: true,
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
        (flowConfig as unknown as { sources?: Record<string, unknown> })
          .sources || {},
      ).length > 0 ||
      Object.keys(
        (flowConfig as unknown as { destinations?: Record<string, unknown> })
          .destinations || {},
      ).length > 0;

    if (hasSourcesOrDests && !buildOptions.packages['@walkeros/collector']) {
      buildOptions.packages['@walkeros/collector'] = {};
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

    // Step 4: Create entry point
    logger.debug('Creating entry point');
    const entryContent = await createEntryPoint(
      flowConfig,
      buildOptions,
      packagePaths,
    );
    const entryPath = path.join(TEMP_DIR, 'entry.js');
    await fs.writeFile(entryPath, entryContent);

    // Step 4: Bundle with esbuild
    logger.debug(
      `Running esbuild (target: ${buildOptions.target || 'es2018'}, format: ${buildOptions.format})`,
    );
    const outputPath = path.resolve(buildOptions.output);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    const esbuildOptions = createEsbuildOptions(
      buildOptions,
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

    // Get file size and calculate build time
    const outputStats = await fs.stat(outputPath);
    const sizeKB = (outputStats.size / 1024).toFixed(1);
    const buildTime = ((Date.now() - bundleStartTime) / 1000).toFixed(1);
    logger.log(`Output: ${outputPath} (${sizeKB} KB, ${buildTime}s)`);

    // Step 5: Cache the build result if caching is enabled
    if (buildOptions.cache !== false) {
      const configContent = generateCacheKeyContent(flowConfig, buildOptions);
      const buildOutput = await fs.readFile(outputPath, 'utf-8');
      await cacheBuild(configContent, buildOutput);
      logger.debug('Build cached for future use');
    }

    // Step 6: Collect stats if requested
    let stats: BundleStats | undefined;
    if (showStats) {
      stats = await collectBundleStats(
        outputPath,
        buildOptions.packages,
        bundleStartTime,
        entryContent,
      );
    }

    // Step 7: Copy included folders to output directory
    if (buildOptions.include && buildOptions.include.length > 0) {
      const outputDir = path.dirname(outputPath);
      await copyIncludes(
        buildOptions.include,
        buildOptions.configDir || process.cwd(),
        outputDir,
        logger,
      );
    }

    // No auto-cleanup - user runs `walkeros clean` explicitly

    return stats;
  } catch (error) {
    throw error;
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
  logger: Logger,
): esbuild.BuildOptions {
  // Don't use aliases - they cause esbuild to bundle even external packages
  // Instead, use absWorkingDir to point to temp directory where node_modules is
  const alias: Record<string, string> = {};

  const baseOptions: esbuild.BuildOptions = {
    entryPoints: [entryPath],
    bundle: true,
    format: buildOptions.format as esbuild.Format,
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
    // For Node.js bundles, mark Node built-ins as external
    const nodeBuiltins = [
      'crypto',
      'fs',
      'path',
      'os',
      'util',
      'stream',
      'buffer',
      'events',
      'http',
      'https',
      'url',
      'querystring',
      'zlib',
    ];
    // Mark runtime dependencies as external
    // These packages are installed in the Docker container and should not be bundled
    // - express/cors: Runtime dependencies for server sources
    // Note: zod is bundled inline via @walkeros/core (not marked external)
    // Use wildcard patterns to match both ESM and CJS imports
    const npmPackages = ['express', 'express/*', 'cors', 'cors/*'];
    // All downloaded @walkeros packages will be bundled into the output
    // Only Node.js built-ins and runtime server packages (express/cors) are marked external
    baseOptions.external = buildOptions.external
      ? [...nodeBuiltins, ...npmPackages, ...buildOptions.external]
      : [...nodeBuiltins, ...npmPackages];

    // Add createRequire shim for ESM bundles with CJS external dependencies
    // This allows require() calls generated by esbuild to work in ESM context
    if (buildOptions.format === 'esm') {
      baseOptions.banner = {
        js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
      };
    }
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
function detectDestinationPackages(flowConfig: Flow.Config): Set<string> {
  const destinationPackages = new Set<string>();
  const destinations = (
    flowConfig as unknown as { destinations?: Record<string, unknown> }
  ).destinations;

  if (destinations) {
    for (const [destKey, destConfig] of Object.entries(destinations)) {
      // Require explicit package field - no inference for any packages
      if (
        typeof destConfig === 'object' &&
        destConfig !== null &&
        'package' in destConfig &&
        typeof destConfig.package === 'string'
      ) {
        destinationPackages.add(destConfig.package);
      }
      // If no package field, skip auto-importing examples for this destination
    }
  }

  return destinationPackages;
}

/**
 * Detects source packages from flow configuration.
 * Extracts package names from sources that have explicit 'package' field.
 */
function detectSourcePackages(flowConfig: Flow.Config): Set<string> {
  const sourcePackages = new Set<string>();
  const sources = (
    flowConfig as unknown as { sources?: Record<string, unknown> }
  ).sources;

  if (sources) {
    for (const [sourceKey, sourceConfig] of Object.entries(sources)) {
      // Require explicit package field - no inference for any packages
      if (
        typeof sourceConfig === 'object' &&
        sourceConfig !== null &&
        'package' in sourceConfig &&
        typeof sourceConfig.package === 'string'
      ) {
        sourcePackages.add(sourceConfig.package);
      }
    }
  }

  return sourcePackages;
}

/**
 * Detects explicit code imports from destinations and sources.
 * Returns a map of package names to sets of export names.
 */
function detectExplicitCodeImports(
  flowConfig: Flow.Config,
): Map<string, Set<string>> {
  const explicitCodeImports = new Map<string, Set<string>>();

  // Check destinations
  const destinations = (
    flowConfig as unknown as { destinations?: Record<string, unknown> }
  ).destinations;

  if (destinations) {
    for (const [destKey, destConfig] of Object.entries(destinations)) {
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
    flowConfig as unknown as { sources?: Record<string, unknown> }
  ).sources;

  if (sources) {
    for (const [sourceKey, sourceConfig] of Object.entries(sources)) {
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

  return explicitCodeImports;
}

interface ImportGenerationResult {
  importStatements: string[];
  examplesMappings: string[];
}

/**
 * Generates import statements and examples mappings from build packages.
 * Handles explicit imports, default imports for destinations/sources, and utility imports.
 */
function generateImportStatements(
  packages: BuildOptions['packages'],
  destinationPackages: Set<string>,
  sourcePackages: Set<string>,
  explicitCodeImports: Map<string, Set<string>>,
): ImportGenerationResult {
  const importStatements: string[] = [];
  const examplesMappings: string[] = [];
  const usedPackages = new Set([...destinationPackages, ...sourcePackages]);

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

      // Check if this package imports examples and create mappings
      const examplesImport = uniqueImports.find((imp) =>
        imp.includes('examples as '),
      );
      if (examplesImport) {
        const examplesVarName = examplesImport.split(' as ')[1];
        const destinationMatch = packageName.match(
          /@walkeros\/web-destination-(.+)$/,
        );
        if (destinationMatch) {
          const destinationName = destinationMatch[1];
          examplesMappings.push(
            `  ${destinationName}: typeof ${examplesVarName} !== 'undefined' ? ${examplesVarName} : undefined`,
          );
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

  return { importStatements, examplesMappings };
}

/**
 * Creates the entry point code for the bundle.
 * Generates imports, config object, and platform-specific wrapper programmatically.
 */
export async function createEntryPoint(
  flowConfig: Flow.Config,
  buildOptions: BuildOptions,
  packagePaths: Map<string, string>,
): Promise<string> {
  // Detect packages used by destinations and sources
  const destinationPackages = detectDestinationPackages(flowConfig);
  const sourcePackages = detectSourcePackages(flowConfig);
  const explicitCodeImports = detectExplicitCodeImports(flowConfig);

  // Generate import statements
  const { importStatements } = generateImportStatements(
    buildOptions.packages,
    destinationPackages,
    sourcePackages,
    explicitCodeImports,
  );

  const importsCode = importStatements.join('\n');
  const hasFlow = destinationPackages.size > 0 || sourcePackages.size > 0;

  // If no sources/destinations, just return user code with imports (no flow wrapper)
  if (!hasFlow) {
    const userCode = buildOptions.code || '';
    return importsCode ? `${importsCode}\n\n${userCode}` : userCode;
  }

  // Build config object programmatically (DRY - single source of truth)
  const configObject = buildConfigObject(flowConfig, explicitCodeImports);

  // Generate platform-specific wrapper
  const wrappedCode = generatePlatformWrapper(
    configObject,
    buildOptions.code || '',
    buildOptions as {
      platform: string;
      windowCollector?: string;
      windowElb?: string;
    },
  );

  // Assemble final code
  return importsCode ? `${importsCode}\n\n${wrappedCode}` : wrappedCode;
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
 * Build config object string from flow configuration.
 * Respects import strategy decisions from detectExplicitCodeImports.
 */
export function buildConfigObject(
  flowConfig: Flow.Config,
  explicitCodeImports: Map<string, Set<string>>,
): string {
  const flowWithProps = flowConfig as unknown as {
    sources?: Record<
      string,
      { package: string; code?: string; config?: unknown; env?: unknown }
    >;
    destinations?: Record<
      string,
      { package: string; code?: string; config?: unknown; env?: unknown }
    >;
    collector?: unknown;
  };

  const sources = flowWithProps.sources || {};
  const destinations = flowWithProps.destinations || {};

  // Build sources
  const sourcesEntries = Object.entries(sources).map(([key, source]) => {
    const hasExplicitCode =
      source.code && explicitCodeImports.has(source.package);
    const codeVar = hasExplicitCode
      ? source.code
      : packageNameToVariable(source.package);

    const configStr = source.config ? processConfigValue(source.config) : '{}';
    const envStr = source.env
      ? `,\n      env: ${processConfigValue(source.env)}`
      : '';

    return `    ${key}: {\n      code: ${codeVar},\n      config: ${configStr}${envStr}\n    }`;
  });

  // Build destinations
  const destinationsEntries = Object.entries(destinations).map(
    ([key, dest]) => {
      const hasExplicitCode =
        dest.code && explicitCodeImports.has(dest.package);
      const codeVar = hasExplicitCode
        ? dest.code
        : packageNameToVariable(dest.package);

      const configStr = dest.config ? processConfigValue(dest.config) : '{}';
      const envStr = dest.env
        ? `,\n      env: ${processConfigValue(dest.env)}`
        : '';

      return `    ${key}: {\n      code: ${codeVar},\n      config: ${configStr}${envStr}\n    }`;
    },
  );

  // Build collector
  const collectorStr = flowWithProps.collector
    ? `,\n  ...${processConfigValue(flowWithProps.collector)}`
    : '';

  return `{
  sources: {
${sourcesEntries.join(',\n')}
  },
  destinations: {
${destinationsEntries.join(',\n')}
  }${collectorStr}
}`;
}

/**
 * Process config value for serialization.
 * Uses existing serializer utilities.
 */
function processConfigValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/**
 * Generate platform-specific wrapper code.
 */
export function generatePlatformWrapper(
  configObject: string,
  userCode: string,
  buildOptions: {
    platform: string;
    windowCollector?: string;
    windowElb?: string;
  },
): string {
  if (buildOptions.platform === 'browser') {
    // Web platform: IIFE with browser globals
    const windowAssignments = [];
    if (buildOptions.windowCollector) {
      windowAssignments.push(
        `  if (typeof window !== 'undefined') window['${buildOptions.windowCollector}'] = collector;`,
      );
    }
    if (buildOptions.windowElb) {
      windowAssignments.push(
        `  if (typeof window !== 'undefined') window['${buildOptions.windowElb}'] = elb;`,
      );
    }
    const assignments =
      windowAssignments.length > 0 ? '\n' + windowAssignments.join('\n') : '';

    return `(async () => {
  const config = ${configObject};

  ${userCode}

  const { collector, elb } = await startFlow(config);${assignments}
})();`;
  } else {
    // Server platform: Export default function
    const codeSection = userCode ? `\n  ${userCode}\n` : '';

    return `export default async function(context = {}) {
  const config = ${configObject};${codeSection}
  // Apply context overrides (e.g., logger config from CLI)
  if (context.logger) {
    config.logger = { ...config.logger, ...context.logger };
  }

  return await startFlow(config);
}`;
  }
}
