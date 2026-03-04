/* eslint-disable no-console */
import chalk from 'chalk';
const BRAND_COLOR = '#01b5e2';

export function printBanner(version: string): void {
  const b = chalk.hex(BRAND_COLOR);

  console.error(`${b('        ╱╱')}`);
  console.error(`${b(' ╱╱    ╱╱')}   ${b('walkerOS')}`);
  console.error(`${b('╱╱ ╱╱ ╱╱')}    v${version}`);
  console.error('');
}
