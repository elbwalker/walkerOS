import { program } from 'commander';
import chalk from 'chalk';
import { generateWalkerOSBundle } from './index';
import {
  loadFlowConfig,
  writeBundleFile,
  validateFlowConfigPath,
  validateBundlePath,
  isJsonString,
} from './core/file-io';
import { parseFlowConfig } from './core/parser';

// Get package version
const packageVersion = '0.0.1'; // Could be imported from package.json if needed

program
  .name('walkeros-gen')
  .description('Generate walkerOS bundles from Flow configurations')
  .version(packageVersion);

program
  .requiredOption('-f, --flow <path>', 'Path to Flow configuration JSON file')
  .option(
    '-o, --output <path>',
    'Output path for generated bundle (if not specified, outputs to stdout)',
  )
  .option('-v, --verbose', 'Enable verbose output')
  .option(
    '--cache-dir <path>',
    'Cache directory for downloaded packages (speeds up subsequent runs)',
  )
  .option(
    '--build-dir <path>',
    'Directory to keep build artifacts for inspection',
  )
  .option(
    '--no-cleanup',
    'Skip cleanup of temporary directories (useful for debugging)',
  )
  .action(async (options) => {
    const {
      flow: flowPath,
      output: outputPath,
      verbose,
      cacheDir,
      buildDir,
      noCleanup,
    } = options;

    try {
      // Validate input (only validate file extension for file paths, not JSON strings)
      if (!isJsonString(flowPath)) {
        validateFlowConfigPath(flowPath);
      }
      if (outputPath) {
        validateBundlePath(outputPath);
      }

      if (verbose) {
        console.log(chalk.blue('🔧 WalkerOS Generator'));
        if (isJsonString(flowPath)) {
          console.log(
            chalk.gray('Reading Flow configuration from JSON string'),
          );
        } else {
          console.log(
            chalk.gray(`Reading Flow configuration from: ${flowPath}`),
          );
        }
        if (cacheDir) {
          console.log(chalk.gray(`Using package cache: ${cacheDir}`));
        }
        if (buildDir) {
          console.log(
            chalk.gray(`Build artifacts will be saved to: ${buildDir}`),
          );
        }
        if (noCleanup) {
          console.log(
            chalk.gray('Temporary directories will not be cleaned up'),
          );
        }
      }

      // Read and validate Flow configuration (smart detection)
      const flowConfig = loadFlowConfig(flowPath);

      if (verbose) {
        console.log(chalk.gray('✓ Flow configuration loaded'));
        console.log(
          chalk.gray('📦 Resolving packages (this may take a few seconds)...'),
        );
      }

      // Generate bundle
      const startTime = Date.now();
      const result = await generateWalkerOSBundle({
        flow: flowConfig,
        cacheOptions: {
          cacheDir,
          buildDir,
          noCleanup,
        },
      });
      const duration = Date.now() - startTime;

      if (verbose) {
        console.log(
          chalk.green(`✓ Bundle generated successfully in ${duration}ms`),
        );
      }

      // Output bundle
      if (outputPath) {
        writeBundleFile(outputPath, result.bundle);
        if (verbose) {
          console.log(chalk.green(`✓ Bundle written to: ${outputPath}`));
        } else {
          console.log(chalk.green(`Bundle written to: ${outputPath}`));
        }
      } else {
        // Output to stdout
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
