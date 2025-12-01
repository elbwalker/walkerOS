import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import type { BuildOptions } from '../../types/bundle.js';
import type { SourceDestinationItem } from '../../types/template.js';
import { downloadPackages } from './package-manager.js';
import { TemplateEngine } from './template-engine.js';
import type { Logger } from '../../core/index.js';
import { getTempDir } from '../../config/index.js';
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
  // Only generate a new temp dir if one isn't explicitly provided
  // This allows simulator to share its temp dir with the bundler
  // Ensure TEMP_DIR is always absolute (esbuild requirement)
  const TEMP_DIR = buildOptions.tempDir
    ? path.isAbsolute(buildOptions.tempDir)
      ? buildOptions.tempDir
      : path.resolve(buildOptions.tempDir)
    : getTempDir();

  // Check build cache if caching is enabled
  if (buildOptions.cache !== false) {
    const configContent = generateCacheKeyContent(flowConfig, buildOptions);

    const cached = await isBuildCached(configContent);
    if (cached) {
      const cachedBuild = await getCachedBuild(configContent);
      if (cachedBuild) {
        logger.info('✨ Using cached build');

        // Write cached build to output
        const outputPath = path.resolve(buildOptions.output);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, cachedBuild);

        logger.gray(`Output: ${outputPath}`);
        logger.success('✅ Build completed (from cache)');

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
    // Step 1: Prepare temporary directory
    // Only clean if we created a new temp dir (don't clean shared simulator temp)
    if (!buildOptions.tempDir) {
      await fs.emptyDir(TEMP_DIR);
    }
    logger.debug('Cleaned temporary directory');

    // Step 2: Download packages
    logger.info('📥 Downloading packages...');
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
    logger.info('📝 Creating entry point...');
    const entryContent = await createEntryPoint(
      flowConfig,
      buildOptions,
      packagePaths,
    );
    const entryPath = path.join(TEMP_DIR, 'entry.js');
    await fs.writeFile(entryPath, entryContent);

    // Step 4: Bundle with esbuild
    logger.info('⚡ Bundling with esbuild...');
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
    }

    logger.gray(`Output: ${outputPath}`);

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

    // Step 8: Cleanup
    // Only cleanup if we created our own temp dir (not shared with simulator)
    if (!buildOptions.tempDir) {
      await fs.remove(TEMP_DIR);
      logger.debug('Cleaned up temporary files');
    }

    return stats;
  } catch (error) {
    // Cleanup on error (only if we created our own temp dir)
    if (!buildOptions.tempDir) {
      await fs.remove(TEMP_DIR).catch(() => {});
    }
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

// Helper function to convert package name to JS variable name
function packageNameToVariable(packageName: string): string {
  return packageName
    .replace('@', '_')
    .replace(/[/-]/g, '_')
    .split('_')
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
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

interface ImportGenerationResult {
  importStatements: string[];
  examplesMappings: string[];
}

/**
 * Generates import statements and examples mappings from build packages.
 * Handles explicit imports, namespace imports, and auto-imports for destination packages.
 */
function generateImportStatements(
  packages: BuildOptions['packages'],
  destinationPackages: Set<string>,
): ImportGenerationResult {
  const importStatements: string[] = [];
  const examplesMappings: string[] = [];

  for (const [packageName, packageConfig] of Object.entries(packages)) {
    if (packageConfig.imports && packageConfig.imports.length > 0) {
      // Remove duplicates within the same package
      const uniqueImports = [...new Set(packageConfig.imports)];

      // Handle special "default as X" syntax
      const defaultImports: string[] = [];
      const namedImports: string[] = [];

      for (const imp of uniqueImports) {
        if (imp.startsWith('default as ')) {
          defaultImports.push(imp.replace('default as ', ''));
        } else {
          namedImports.push(imp);
        }
      }

      // Generate import statements
      if (defaultImports.length > 0) {
        for (const defaultImport of defaultImports) {
          importStatements.push(
            `import ${defaultImport} from '${packageName}';`,
          );
        }
      }

      if (namedImports.length > 0) {
        const importList = namedImports.join(', ');
        importStatements.push(
          `import { ${importList} } from '${packageName}';`,
        );
      }

      // Check if this package imports examples and create mappings
      const examplesImport = uniqueImports.find((imp) =>
        imp.includes('examples as '),
      );
      if (examplesImport) {
        // Extract destination name and examples variable name
        // Format: "examples as gtagExamples" -> gtagExamples
        const examplesVarName = examplesImport.split(' as ')[1];
        // Get destination name from package (assumes @walkeros/web-destination-xxx format)
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
    } else {
      // No imports specified - import as namespace with a warning comment
      // User should specify explicit imports for better tree-shaking
      const varName = packageNameToVariable(packageName);
      importStatements.push(
        `import * as ${varName} from '${packageName}'; // Consider specifying explicit imports`,
      );
    }

    // Examples are no longer auto-imported - simulator loads them dynamically
  }

  return { importStatements, examplesMappings };
}

/**
 * Processes template if configured, otherwise returns code directly.
 * Applies TemplateEngine to transform code with flow configuration.
 */
async function processTemplate(
  flowConfig: Flow.Config,
  buildOptions: BuildOptions,
): Promise<string> {
  if (buildOptions.template) {
    const templateEngine = new TemplateEngine();
    const flowWithProps = flowConfig as unknown as {
      sources?: Record<string, unknown>;
      destinations?: Record<string, unknown>;
      collector?: Record<string, unknown>;
    };
    return await templateEngine.process(
      buildOptions.template,
      buildOptions.code || '', // Pass user code as parameter (empty if undefined)
      (flowWithProps.sources || {}) as unknown as Record<
        string,
        SourceDestinationItem
      >,
      (flowWithProps.destinations || {}) as unknown as Record<
        string,
        SourceDestinationItem
      >,
      (flowWithProps.collector || {}) as unknown as Record<string, unknown>,
      buildOptions as unknown as Record<string, unknown>, // Pass build config to template
    );
  } else {
    // No template - just use the code directly
    return buildOptions.code || '';
  }
}

/**
 * Wraps code for specific output formats.
 * Adds export wrapper for ESM without template when no export exists.
 */
function wrapCodeForFormat(
  code: string,
  format: BuildOptions['format'],
  hasTemplate: boolean,
): string {
  // Template outputs ready-to-use code - no wrapping needed
  if (hasTemplate) {
    return code;
  }

  // Only add export wrapper for server ESM without template
  if (format === 'esm') {
    // Check if code already has export statements
    const hasExport = /^\s*export\s/m.test(code);

    if (!hasExport) {
      // Raw code without export - wrap as default export
      return `export default ${code}`;
    }
  }

  return code;
}

/**
 * Assembles the final entry point code from all components.
 * Combines imports, examples object, and wrapped code with format-specific exports.
 */
function assembleFinalCode(
  importStatements: string[],
  examplesObject: string,
  wrappedCode: string,
  format: BuildOptions['format'],
): string {
  const importsCode = importStatements.join('\n');

  let finalCode = importsCode
    ? `${importsCode}\n\n${examplesObject}${wrappedCode}`
    : `${examplesObject}${wrappedCode}`;

  // Make examples available for ESM
  if (examplesObject && format === 'esm') {
    // ESM: export as named export
    finalCode += `\n\nexport { examples };`;
  }

  return finalCode;
}

async function createEntryPoint(
  flowConfig: Flow.Config,
  buildOptions: BuildOptions,
  packagePaths: Map<string, string>,
): Promise<string> {
  // Detect destination packages for auto-importing examples
  const destinationPackages = detectDestinationPackages(flowConfig);

  // Generate import statements (examples generation removed)
  const { importStatements } = generateImportStatements(
    buildOptions.packages,
    destinationPackages,
  );

  // No longer generate examples in bundles - simulator loads them dynamically
  const examplesObject = '';

  // Process template or use code directly
  const templatedCode = await processTemplate(flowConfig, buildOptions);

  // Wrap code for specific output format
  const wrappedCode = wrapCodeForFormat(
    templatedCode,
    buildOptions.format,
    !!buildOptions.template,
  );

  // Assemble final entry point code
  return assembleFinalCode(
    importStatements,
    examplesObject,
    wrappedCode,
    buildOptions.format,
  );
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
