/* eslint-disable no-console */
import chalk from 'chalk';
import { BRAND_COLOR } from './logger.js';

export function printBanner(version: string): void {
  const b = chalk.hex(BRAND_COLOR);

  console.error(`${b('        ╱╱')}`);
  console.error(`${b(' ╱╱    ╱╱')}   ${b('walkerOS')}`);
  console.error(`${b('╱╱ ╱╱ ╱╱')}    v${version}`);
  console.error('');
}
