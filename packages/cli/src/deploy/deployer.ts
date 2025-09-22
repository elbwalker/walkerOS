import type { Driver } from '@walkeros/core';
import type { DeployerConfig, DeploymentResult } from './types';
import { loadDriver } from './driver-loader';
import { Logger } from '../core';

export class Deployer {
  private config: DeployerConfig;
  private env?: Driver.Environment;
  private logger: Logger;

  constructor(
    config: DeployerConfig,
    logger: Logger,
    env?: Driver.Environment,
  ) {
    this.config = config;
    this.env = env;
    this.logger = logger;
  }

  async deploy(): Promise<DeploymentResult[]> {
    const results: DeploymentResult[] = [];

    if (!this.config.drivers) {
      this.logger.warning('No drivers configured');
      return results;
    }

    for (const [name, driverConfig] of Object.entries(this.config.drivers)) {
      this.logger.info(`\nDeploying with driver: ${name}`);

      try {
        const driver = await loadDriver(name, driverConfig, this.env);

        const context: Driver.Context = {
          config: driver.config,
          env: this.env || {},
        };

        // Initialize driver if it has init method
        if (driver.init) {
          this.logger.debug(`Initializing ${name}...`);
          const initResult = await driver.init(context);
          if (initResult) {
            driver.config = initResult;
          }
        }

        // Deploy - this is now stubbed
        this.logger.debug(`Deploying with ${name} (simulated)...`);

        // Simulate some delay for realism
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 1000 + 500),
        );

        const deployContext: Driver.DeployContext = {
          ...context,
          artifactPath: driverConfig.artifactPath || '',
        };

        const deployResult = await driver.deploy(deployContext);

        this.logger.success(`✓ Deployed to: ${deployResult.url}`);
        if (deployResult.metadata) {
          this.logger.debug(
            `Metadata: ${JSON.stringify(deployResult.metadata)}`,
          );
        }

        results.push({
          driver: name,
          status: 'success',
          result: deployResult,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`✗ Failed: ${errorMessage}`);

        results.push({
          driver: name,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    return results;
  }
}
