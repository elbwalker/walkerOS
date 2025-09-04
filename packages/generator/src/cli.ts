import { program } from 'commander';
import chalk from 'chalk';
import { generateWalkerOSBundle } from './index';
import {
  loadCollectorConfig,
  writeBundleFile,
  validateConfigPath,
  validateBundlePath,
  isJsonString,
  ensureDirectoryExists,
} from './core/file-io';
import { parseCollectorConfig, parsePackageDefinitions } from './core/parser';

// Get package version
const packageVersion = '0.0.1'; // Could be imported from package.json if needed

program
  .name('walkeros-gen')
  .description('Generate walkerOS bundles from collector configurations')
  .version(packageVersion);

program
  .requiredOption(
    '-c, --config <path>',
    'Path to collector configuration JSON file or JSON string',
  )
  .option(
    '-o, --output <path>',
    'Output path for generated bundle (default: ./output/result.js)',
  )
  .option('--stdout', 'Output bundle to stdout instead of writing to file')
  .option('-v, --verbose', 'Enable verbose output')
  .option(
    '--cache-dir <path>',
    'Cache directory for downloaded packages (speeds up subsequent runs)',
  )
  .option(
    '--build-dir <path>',
    'Directory to keep build artifacts and reuse npm installations',
  )
  .option(
    '--no-cache',
    'Skip package cache (still uses build directory for npm installations)',
  )
  .option(
    '--clean',
    'Clean build directory before starting (forces fresh download)',
  )
  .action(async (options) => {
    const {
      config: configPath,
      output: outputPath,
      stdout: outputToStdout,
      verbose,
      cacheDir,
      buildDir,
      noCache,
      clean,
    } = options;

    try {
      // Set default output path
      const finalOutputPath = outputToStdout
        ? null
        : outputPath || './output/result.js';

      // Validate input (only validate file extension for file paths, not JSON strings)
      if (!isJsonString(configPath)) {
        validateConfigPath(configPath);
      }
      if (finalOutputPath) {
        validateBundlePath(finalOutputPath);
      }

      if (verbose) {
        console.log(chalk.blue('🔧 WalkerOS Generator'));
        if (isJsonString(configPath)) {
          console.log(
            chalk.gray('Reading collector configuration from JSON string'),
          );
        } else {
          console.log(
            chalk.gray(`Reading collector configuration from: ${configPath}`),
          );
        }
        if (finalOutputPath) {
          console.log(
            chalk.gray(`Bundle will be written to: ${finalOutputPath}`),
          );
        } else {
          console.log(chalk.gray('Bundle will be output to stdout'));
        }
        if (cacheDir) {
          console.log(chalk.gray(`Using package cache: ${cacheDir}`));
        }
        if (buildDir) {
          console.log(
            chalk.gray(`Build artifacts will be saved to: ${buildDir}`),
          );
        }
        if (noCache) {
          console.log(chalk.gray('Package cache disabled'));
        }
        if (clean) {
          console.log(
            chalk.gray('Build directory will be cleaned before starting'),
          );
        }
      }

      // Read and validate collector configuration (smart detection)
      const configData = loadCollectorConfig(configPath);

      if (verbose) {
        console.log(chalk.gray('✓ Collector configuration loaded'));
        console.log(
          chalk.gray('📦 Resolving packages (this may take a few seconds)...'),
        );
      }

      // Generate bundle
      const startTime = Date.now();
      const result = await generateWalkerOSBundle({
        config: configData.config,
        packages: configData.packages,
        cacheOptions: {
          cacheDir,
          buildDir,
          noCache,
          clean,
        },
      });
      const duration = Date.now() - startTime;

      if (verbose) {
        console.log(
          chalk.green(`✓ Bundle generated successfully in ${duration}ms`),
        );
      }

      // Output bundle
      if (finalOutputPath) {
        writeBundleFile(finalOutputPath, result.bundle);
        if (verbose) {
          console.log(chalk.green(`✓ Bundle written to: ${finalOutputPath}`));
        } else {
          console.log(chalk.green(`Bundle written to: ${finalOutputPath}`));
        }
      } else {
        // Output to stdout only when --stdout flag is used
        console.log(result.bundle);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(chalk.red('❌ Error:'), errorMessage);

      if (verbose && error instanceof Error && error.stack) {
        console.error(chalk.gray('Stack trace:'));
        console.error(chalk.gray(error.stack));
      }

      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', (operands) => {
  console.error(chalk.red(`❌ Unknown command: ${operands[0]}`));
  console.log(chalk.gray('Run with --help to see available commands'));
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
