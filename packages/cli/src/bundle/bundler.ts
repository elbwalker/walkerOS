import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs-extra';
import { BundleConfig, BuildConfig } from './config';
import { downloadPackages } from './package-manager';
import { TemplateEngine } from './template-engine';
import { Logger, getTempDir } from '../core';

export interface BundleStats {
  totalSize: number;
  packages: { name: string; size: number }[];
  buildTime: number;
  treeshakingEffective: boolean;
}

export async function bundle(
  config: BundleConfig,
  logger: Logger,
  showStats = false,
): Promise<BundleStats | void> {
  const bundleStartTime = Date.now();
  // Only generate a new temp dir if one isn't explicitly provided
  // This allows simulator to share its temp dir with the bundler
  const TEMP_DIR = config.tempDir || getTempDir();

  try {
    // Step 1: Prepare temporary directory
    // Only clean if we created a new temp dir (don't clean shared simulator temp)
    if (!config.tempDir) {
      await fs.emptyDir(TEMP_DIR);
    }
    logger.debug('Cleaned temporary directory');

    // Step 2: Download packages
    logger.info('📥 Downloading packages...');
    // Convert packages object to array format expected by downloadPackages
    const packagesArray = Object.entries(config.packages).map(
      ([name, packageConfig]) => ({
        name,
        version: packageConfig.version || 'latest',
      }),
    );
    // downloadPackages adds 'node_modules' subdirectory automatically
    const packagePaths = await downloadPackages(
      packagesArray,
      TEMP_DIR,
      logger,
      config.cache,
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
    const entryContent = await createEntryPoint(config, packagePaths);
    const entryPath = path.join(TEMP_DIR, 'entry.js');
    await fs.writeFile(entryPath, entryContent);

    // Step 4: Bundle with esbuild
    logger.info('⚡ Bundling with esbuild...');
    const outputPath = path.resolve(config.output);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    const buildOptions = createEsbuildOptions(
      config.build,
      entryPath,
      outputPath,
      TEMP_DIR,
      packagePaths,
      logger,
    );

    try {
      await esbuild.build(buildOptions);
    } catch (buildError) {
      // Enhanced error handling for build failures
      throw createBuildError(buildError as EsbuildError, config.code);
    }

    logger.gray(`Output: ${outputPath}`);

    // Step 5: Collect stats if requested
    let stats: BundleStats | undefined;
    if (showStats) {
      stats = await collectBundleStats(
        outputPath,
        config.packages,
        bundleStartTime,
        entryContent,
      );
    }

    // Step 6: Cleanup
    // Only cleanup if we created our own temp dir (not shared with simulator)
    if (!config.tempDir) {
      await fs.remove(TEMP_DIR);
      logger.debug('Cleaned up temporary files');
    }

    return stats;
  } catch (error) {
    // Cleanup on error (only if we created our own temp dir)
    if (!config.tempDir) {
      await fs.remove(TEMP_DIR).catch(() => {});
    }
    throw error;
  }
}

async function collectBundleStats(
  outputPath: string,
  packages: BundleConfig['packages'],
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
  buildConfig: BuildConfig,
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
    format: buildConfig.format as esbuild.Format,
    platform: buildConfig.platform as esbuild.Platform,
    outfile: outputPath,
    absWorkingDir: tempDir, // Resolve modules from temp directory
    // alias removed - not needed with absWorkingDir
    mainFields: ['module', 'main'], // Prefer ESM over CJS
    treeShaking: true,
    logLevel: 'error',
    minify: buildConfig.minify,
    sourcemap: buildConfig.sourcemap,
    resolveExtensions: ['.mjs', '.js', '.ts', '.json'], // Prefer .mjs

    // Enhanced minification options when minify is enabled
    ...(buildConfig.minify && {
      minifyWhitespace: buildConfig.minifyOptions?.whitespace ?? true,
      minifyIdentifiers: buildConfig.minifyOptions?.identifiers ?? true,
      minifySyntax: buildConfig.minifyOptions?.syntax ?? true,
      legalComments: buildConfig.minifyOptions?.legalComments ?? 'none',
      keepNames: buildConfig.minifyOptions?.keepNames ?? false,
      charset: 'utf8',
    }),
  };

  // Platform-specific configurations
  if (buildConfig.platform === 'browser') {
    baseOptions.define = {
      'process.env.NODE_ENV': '"production"',
      global: 'globalThis',
    };
    // For browser bundles, let users handle Node.js built-ins as needed
    baseOptions.external = buildConfig.external || [];
  } else if (buildConfig.platform === 'node') {
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
    // Mark zod as external to prevent double-loading when CLI imports examples
    // and bundle imports destinations (both use @walkeros/core which imports zod)
    // Use wildcard patterns to match both ESM and CJS imports
    const npmPackages = [
      'zod',
      'zod-to-json-schema',
      'zod/*',
      'zod-to-json-schema/*',
    ];
    // ALSO mark all downloaded @walkeros packages as external
    // Even though we alias them, they should not be bundled
    const walkerosPackages = Array.from(packagePaths.keys()).filter((name) =>
      name.startsWith('@walkeros/'),
    );
    baseOptions.external = buildConfig.external
      ? [
          ...nodeBuiltins,
          ...npmPackages,
          ...walkerosPackages,
          ...buildConfig.external,
        ]
      : [...nodeBuiltins, ...npmPackages, ...walkerosPackages];
  }

  // Set target if specified
  if (buildConfig.target) {
    baseOptions.target = buildConfig.target;
  } else if (buildConfig.platform === 'node') {
    baseOptions.target = 'node18';
  } else {
    baseOptions.target = 'es2018';
  }

  // Set global name for IIFE format
  if (buildConfig.globalName && buildConfig.format === 'iife') {
    baseOptions.globalName = buildConfig.globalName;
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

async function createEntryPoint(
  config: BundleConfig,
  packagePaths: Map<string, string>,
): Promise<string> {
  // Generate import statements from packages
  const importStatements: string[] = [];
  const examplesMappings: string[] = [];

  // For simulation mode, automatically import examples from destination packages
  // This ensures examples are loaded in the SAME execution context as the bundle
  // preventing zod double-loading issues
  const destinationPackages = new Set<string>();
  if (config.destinations) {
    for (const [destKey, destConfig] of Object.entries(config.destinations)) {
      // Require explicit package field - no inference for any packages
      const packageName = (destConfig as any).package;
      if (packageName) {
        destinationPackages.add(packageName);
      }
      // If no package field, skip auto-importing examples for this destination
    }
  }

  for (const [packageName, packageConfig] of Object.entries(config.packages)) {
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

    // Auto-import examples for destination packages
    if (destinationPackages.has(packageName)) {
      const destinationMatch = packageName.match(
        /@walkeros\/(?:(?:web|server)-)?destination-(.+)$/,
      );
      if (destinationMatch) {
        const destinationName = destinationMatch[1];
        const examplesVarName = `${destinationName.replace(/-/g, '_')}_examples`;
        // Try importing from /examples subpath first (standard packages)
        // Fall back to importing { examples } from main module (demo packages)
        const isDemoPackage = packageName.includes('-demo');
        if (isDemoPackage) {
          importStatements.push(
            `import { examples as ${examplesVarName} } from '${packageName}';`,
          );
        } else {
          importStatements.push(
            `import * as ${examplesVarName} from '${packageName}/examples';`,
          );
        }
        examplesMappings.push(`  ${destinationName}: ${examplesVarName}`);
      }
    }
  }

  // Create examples object if we have any mappings
  const examplesObject =
    examplesMappings.length > 0
      ? `const examples = {\n${examplesMappings.join(',\n')}\n};\n\n`
      : '';

  // Separate imports from template processing
  const importsCode = importStatements.join('\n');

  // Apply template if configured, otherwise just use code directly
  let templatedCode: string;
  if (config.template) {
    const templateEngine = new TemplateEngine();
    templatedCode = await templateEngine.process(
      config.template,
      config.code, // Pass user code as parameter
      config.sources || {},
      config.destinations || {},
      config.collector || {},
      config.build, // Pass build config to template
    );
  } else {
    // No template - just use the code directly
    templatedCode = config.code;
  }

  // Apply module format wrapping if needed
  let wrappedCode = templatedCode;

  // Check if code already has any export statements (default, named, etc.)
  const hasExport = /^\s*export\s/m.test(templatedCode);

  if (!hasExport) {
    if (config.build.format === 'esm') {
      // Export as default for ESM
      wrappedCode = `export default ${templatedCode}`;
    } else if (config.build.platform === 'browser' && config.build.globalName) {
      // Assign to window for browser builds with globalName
      wrappedCode = `window['${config.build.globalName}'] = ${templatedCode}`;
    }
  }

  // Combine imports, examples object, and wrapped code
  let finalCode = importsCode
    ? `${importsCode}\n\n${examplesObject}${wrappedCode}`
    : `${examplesObject}${wrappedCode}`;

  // If we have examples, export them as a named export
  if (examplesObject && config.build.format === 'esm') {
    finalCode += `\n\nexport { examples };`;
  }

  return finalCode;
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
