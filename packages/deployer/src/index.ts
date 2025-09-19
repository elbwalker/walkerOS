#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('walkeros-deploy')
  .description(
    'Deploy generated walkerOS files to hosters and ingest functions',
  )
  .version('0.1.0')
  .action(async () => {
    // eslint-disable-next-line no-console
    console.log(chalk.green('moin'));
  });

program.parse();
