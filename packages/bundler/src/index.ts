#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { parseConfig } from './config.js';
import { bundle } from './bundler.js';

const program = new Command();

program
  .name('walkeros-bundle')
  .description('Bundle NPM packages with custom code')
  .version('0.1.0')
  .option(
    '-c, --config <path>',
    'configuration file path',
    'bundle.config.json',
  )
  .action(async (options) => {
    const startTime = Date.now();

    try {
      // Step 1: Read configuration file
      console.log(chalk.blue('📦 Reading configuration...'));
      const configPath = path.resolve(options.config);

      if (!(await fs.pathExists(configPath))) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      const rawConfig = await fs.readJson(configPath);
      const config = parseConfig(rawConfig);

      // Step 2: Run bundler
      console.log(chalk.blue('🔧 Starting bundle process...'));
      await bundle(config);

      // Step 3: Success message
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        chalk.green(`✅ Bundle created successfully in ${duration}s`),
      );
    } catch (error) {
      console.error(chalk.red('❌ Bundle failed:'));
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
