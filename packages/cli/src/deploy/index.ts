import path from 'path';
import { createLogger, formatDuration, createJsonOutput } from '../core';
import { loadDeployConfig, processDeployConfig } from './config';
import { Deployer } from './deployer';

export interface DeployCommandOptions {
  config: string;
  dryRun?: boolean;
  json?: boolean;
  verbose?: boolean;
}

export async function deployCommand(
  options: DeployCommandOptions,
): Promise<void> {
  const startTime = Date.now();
  const logger = createLogger({
    verbose: options.verbose,
    silent: false,
    json: options.json,
  });

  try {
    logger.log('cyan', '\n🚀 walkerOS Deployer (Simulated)\n');

    // Load and process config
    logger.debug(`Loading config from ${options.config}...`);
    const configPath = path.resolve(options.config);
    const rawConfig = await loadDeployConfig(configPath);
    const config = processDeployConfig(rawConfig);

    // Create deployer instance
    const env = options.dryRun ? { dryRun: true } : undefined;
    const deployer = new Deployer(config, logger, env);

    // Run deployment
    logger.info('Starting deployment process...');
    const results = await deployer.deploy();

    // Summary
    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    if (options.json) {
      const output = createJsonOutput(
        failed === 0,
        {
          results,
          summary: { successful, failed },
        },
        failed > 0 ? `${failed} deployment(s) failed` : undefined,
        formatDuration(startTime),
      );
      console.log(JSON.stringify(output, null, 2));
    } else {
      logger.log('cyan', '\n📊 Deployment Summary:');
      if (successful > 0) {
        logger.success(`✓ ${successful} successful`);
      }
      if (failed > 0) {
        logger.error(`✗ ${failed} failed`);
      }

      if (options.dryRun) {
        logger.warning(
          '\n⚠️  This was a dry run - no actual deployments were made',
        );
      } else {
        logger.warning(
          '\n⚠️  This was a simulated deployment - no actual deployments were made',
        );
      }
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    if (options.json) {
      const output = createJsonOutput(
        false,
        undefined,
        error instanceof Error ? error.message : String(error),
        formatDuration(startTime),
      );
      console.log(JSON.stringify(output, null, 2));
    } else {
      logger.error('\n❌ Error:');
      logger.error(error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}
