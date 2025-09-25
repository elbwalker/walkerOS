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
  const TEMP_DIR = getTempDir(config.tempDir);

  try {
    // Step 1: Prepare temporary directory
    await fs.emptyDir(TEMP_DIR);
    logger.debug('Cleaned temporary directory');

    // Step 2: Download packages
    logger.info('📥 Downloading packages...');
    const packagePaths = await downloadPackages(
      config.packages,
      path.join(TEMP_DIR, 'node_modules'),
      logger,
      config.cache,
    );

    // Step 3: Create entry point
    logger.info('📝 Creating entry point...');
    const entryContent = await createEntryPoint(config, packagePaths);
    const entryPath = path.join(TEMP_DIR, 'entry.js');
    await fs.writeFile(entryPath, entryContent);

    // Step 4: Bundle with esbuild
    logger.info('⚡ Bundling with esbuild...');
    const outputPath = path.resolve(config.output.dir, config.output.filename);

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
      throw createBuildError(buildError as EsbuildError, config.content);
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
    await fs.remove(TEMP_DIR);
    logger.debug('Cleaned up temporary files');

    return stats;
  } catch (error) {
    // Cleanup on error
    await fs.remove(TEMP_DIR).catch(() => {});
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
  const packageStats = packages.map((pkg) => {
    const importPattern = new RegExp(`from\\s+['"]${pkg.name}['"]`, 'g');
    const namedImportPattern = new RegExp(
      `import\\s+\\{[^}]*\\}\\s+from\\s+['"]${pkg.name}['"]`,
      'g',
    );
    const hasImports =
      importPattern.test(entryContent) || namedImportPattern.test(entryContent);

    // Rough estimation: if package is imported, assign proportional size
    const estimatedSize = hasImports
      ? Math.floor(totalSize / packages.length)
      : 0;

    return {
      name: `${pkg.name}@${pkg.version}`,
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
  // Create aliases to force esbuild to use downloaded packages
  const alias: Record<string, string> = {};
  for (const [packageName, packagePath] of packagePaths.entries()) {
    alias[packageName] = packagePath;
  }

  const baseOptions: esbuild.BuildOptions = {
    entryPoints: [entryPath],
    bundle: true,
    format: buildConfig.format as esbuild.Format,
    platform: buildConfig.platform as esbuild.Platform,
    outfile: outputPath,
    alias,
    treeShaking: true,
    logLevel: 'error',
    minify: buildConfig.minify,
    sourcemap: buildConfig.sourcemap,
    resolveExtensions: ['.js', '.ts', '.mjs', '.json'],

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
    baseOptions.external = [];
  } else if (buildConfig.platform === 'node') {
    // For Node.js bundles, mark Node built-ins as external
    baseOptions.external = [
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
  }

  // Set target if specified
  if (buildConfig.target) {
    baseOptions.target = buildConfig.target;
  } else if (buildConfig.platform === 'node') {
    baseOptions.target = 'node18';
  } else {
    baseOptions.target = 'es2018';
  }

  return baseOptions;
}

async function createEntryPoint(
  config: BundleConfig,
  packagePaths: Map<string, string>,
): Promise<string> {
  // Generate import statements from packages
  const importStatements: string[] = [];

  for (const pkg of config.packages) {
    if (pkg.imports && pkg.imports.length > 0) {
      // Remove duplicates within the same package
      const uniqueImports = [...new Set(pkg.imports)];
      const importList = uniqueImports.join(', ');
      importStatements.push(`import { ${importList} } from '${pkg.name}';`);
    }
  }

  // Combine imports with content
  const importsCode = importStatements.join('\n');
  const fullCode = importsCode
    ? `${importsCode}\n\n${config.content}`
    : config.content;

  // Apply template if configured
  let finalCode = fullCode;
  if (config.template) {
    const templateEngine = new TemplateEngine();
    finalCode = await templateEngine.process(config.template, fullCode);
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

function createBuildError(buildError: EsbuildError, content: string): Error {
  if (!buildError.errors || buildError.errors.length === 0) {
    return new Error(`Build failed: ${buildError.message || buildError}`);
  }

  const firstError = buildError.errors[0];
  const location = firstError.location;

  if (location && location.file && location.file.includes('entry.js')) {
    // Error is in our generated entry point (content code)
    const line = location.line;
    const column = location.column;
    const codeLines = content.split('\n');
    const errorLine = codeLines[line - 1] || '';

    return new Error(
      `Content syntax error at line ${line}, column ${column}:\n` +
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
