import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs-extra';
import { Config, BuildConfig } from './config.js';
import { downloadPackages } from './package-manager.js';
import chalk from 'chalk';

const TEMP_DIR = path.join(process.cwd(), '.temp');

export async function bundle(config: Config): Promise<void> {
  try {
    // Step 1: Prepare temporary directory
    await fs.emptyDir(TEMP_DIR);
    console.log(chalk.gray('  Cleaned temporary directory'));

    // Step 2: Download packages
    console.log(chalk.blue('📥 Downloading packages...'));
    const packagePaths = await downloadPackages(
      config.packages,
      path.join(TEMP_DIR, 'node_modules'),
    );

    // Step 3: Create entry point
    console.log(chalk.blue('📝 Creating entry point...'));
    const entryContent = createEntryPoint(config, packagePaths);
    const entryPath = path.join(TEMP_DIR, 'entry.js');
    await fs.writeFile(entryPath, entryContent);

    // Step 4: Bundle with esbuild
    console.log(chalk.blue('⚡ Bundling with esbuild...'));
    const outputPath = path.join(config.output.dir, config.output.filename);

    const buildOptions = createEsbuildOptions(
      config.build,
      entryPath,
      outputPath,
    );
    await esbuild.build(buildOptions);

    console.log(chalk.gray(`  Output: ${outputPath}`));

    // Step 5: Cleanup
    await fs.remove(TEMP_DIR);
    console.log(chalk.gray('  Cleaned up temporary files'));
  } catch (error) {
    // Cleanup on error
    await fs.remove(TEMP_DIR).catch(() => {});
    throw error;
  }
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
