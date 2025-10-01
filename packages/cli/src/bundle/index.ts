import path from 'path';
import {
  loadJsonConfig,
  createLogger,
  createTimer,
  createSuccessOutput,
  createErrorOutput,
} from '../core';
import { parseBundleConfig } from './config';
import { bundle } from './bundler';
import { displayStats, createStatsSummary } from './stats';

export interface BundleCommandOptions {
  config: string;
  stats?: boolean;
  json?: boolean;
  cache?: boolean;
  verbose?: boolean;
}

export async function bundleCommand(
  options: BundleCommandOptions,
): Promise<void> {
  const timer = createTimer();
  timer.start();

  const logger = createLogger({
    verbose: options.verbose,
    silent: false,
    json: options.json,
  });

  try {
    // Step 1: Read configuration file
    logger.info('📦 Reading configuration...');
    const configPath = path.resolve(options.config);
    const rawConfig = await loadJsonConfig(configPath);
    const config = parseBundleConfig(rawConfig);

    // Override cache setting from CLI if provided
    if (options.cache !== undefined) {
      config.cache = options.cache;
    }

    // Step 2: Run bundler
    const shouldCollectStats = options.stats || options.json;
    logger.info('🔧 Starting bundle process...');
    const stats = await bundle(config, logger, shouldCollectStats);

    // Step 3: Show stats if requested
    const duration = timer.end() / 1000;

    if (options.json && stats) {
      // JSON output for CI/CD - create output logger that always logs
      const outputLogger = createLogger({ silent: false, json: false });
      const statsSummary = createStatsSummary(stats);
      const output = createSuccessOutput({ stats: statsSummary }, duration);
      outputLogger.log('white', JSON.stringify(output, null, 2));
    } else {
      if (options.stats && stats) {
        displayStats(stats, logger);
      }

      // Step 4: Success message
      logger.success(`✅ Bundle created successfully in ${timer.format()}`);
    }
  } catch (error) {
    const duration = timer.getElapsed() / 1000;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (options.json) {
      // JSON error output for CI/CD - create output logger that always logs
      const outputLogger = createLogger({ silent: false, json: false });
      const output = createErrorOutput(errorMessage, duration);
      outputLogger.log('white', JSON.stringify(output, null, 2));
    } else {
      logger.error('❌ Bundle failed:');
      logger.error(errorMessage);
    }
    process.exit(1);
  }
}
