import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs-extra';
import { Config, BuildConfig } from './config.js';
import { downloadPackages } from './package-manager.js';
import chalk from 'chalk';

const TEMP_DIR = path.join(process.cwd(), '.temp');

export interface BundleStats {
  totalSize: number;
  packages: { name: string; size: number }[];
  buildTime: number;
  treeshakingEffective: boolean;
}

function createLogger(silent: boolean) {
  return (...args: Parameters<typeof console.log>) => {
    if (!silent) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  };
}

export async function bundle(
  config: Config,
  showStats = false,
  silent = false,
): Promise<BundleStats | void> {
  const bundleStartTime = Date.now();
  const log = createLogger(silent);

  try {
    // Step 1: Prepare temporary directory
    await fs.emptyDir(TEMP_DIR);
    log(chalk.gray('  Cleaned temporary directory'));

    // Step 2: Download packages
    log(chalk.blue('📥 Downloading packages...'));
    const packagePaths = await downloadPackages(
      config.packages,
      path.join(TEMP_DIR, 'node_modules'),
      silent,
    );

    // Step 3: Create entry point
    log(chalk.blue('📝 Creating entry point...'));
    const entryContent = createEntryPoint(config, packagePaths);
    const entryPath = path.join(TEMP_DIR, 'entry.js');
    await fs.writeFile(entryPath, entryContent);

    // Step 4: Bundle with esbuild
    log(chalk.blue('⚡ Bundling with esbuild...'));
    const outputPath = path.join(config.output.dir, config.output.filename);

    const buildOptions = createEsbuildOptions(
      config.build,
      entryPath,
      outputPath,
    );

    try {
      const result = await esbuild.build(buildOptions);
    } catch (buildError) {
      // Enhanced error handling for build failures
      throw createBuildError(buildError as EsbuildError, config.customCode);
    }

    log(chalk.gray(`  Output: ${outputPath}`));

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
    log(chalk.gray('  Cleaned up temporary files'));

    return stats;
  } catch (error) {
    // Cleanup on error
    await fs.remove(TEMP_DIR).catch(() => {});
    throw error;
  }
}

async function collectBundleStats(
  outputPath: string,
  packages: Config['packages'],
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
): esbuild.BuildOptions {
  const baseOptions: esbuild.BuildOptions = {
    entryPoints: [entryPath],
    bundle: true,
    format: buildConfig.format as esbuild.Format,
    platform: buildConfig.platform as esbuild.Platform,
    outfile: outputPath,
    treeShaking: true,
    nodePaths: [path.join(TEMP_DIR, 'node_modules')],
    logLevel: 'error',
    minify: buildConfig.minify,
    sourcemap: buildConfig.sourcemap,
    resolveExtensions: ['.js', '.ts', '.mjs', '.json'],
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

function createEntryPoint(
  config: Config,
  packagePaths: Map<string, string>,
): string {
  // Just return the custom code - let it handle all imports
  // Packages are available via esbuild's nodePaths configuration
  return config.customCode;
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

function createBuildError(buildError: EsbuildError, customCode: string): Error {
  if (!buildError.errors || buildError.errors.length === 0) {
    return new Error(`Build failed: ${buildError.message || buildError}`);
  }

  const firstError = buildError.errors[0];
  const location = firstError.location;

  if (location && location.file && location.file.includes('entry.js')) {
    // Error is in our generated entry point (custom code)
    const line = location.line;
    const column = location.column;
    const codeLines = customCode.split('\n');
    const errorLine = codeLines[line - 1] || '';

    return new Error(
      `Custom code syntax error at line ${line}, column ${column}:\n` +
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
