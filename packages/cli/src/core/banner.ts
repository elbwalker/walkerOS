/* eslint-disable no-console */
import chalk from 'chalk';
import { BRAND_COLOR } from './logger.js';

export function printBanner(version: string): void {
  const b = chalk.hex(BRAND_COLOR);
  const g = chalk.gray;

  // === Option 1a: Single ╱ ===
  console.error(g('--- 1a: Single ╱ ---'));
  console.error(`${b('        ╱')}`);
  console.error(`${b(' ╱     ╱')}   ${b('walkerOS')}`);
  console.error(`${b('╱  ╱  ╱')}    v${version}`);
  console.error('');

  // === Option 1b: Double ╱╱ ===
  console.error(g('--- 1b: Double ╱╱ ---'));
  console.error(`${b('        ╱╱')}`);
  console.error(`${b(' ╱╱    ╱╱')}   ${b('walkerOS')}`);
  console.error(`${b('╱╱ ╱╱ ╱╱')}    v${version}`);
  console.error('');

  // === Option 4a: Braille thin ⡜ ===
  console.error(g('--- 4a: Braille thin ⡜ ---'));
  console.error(`${b('        ⡜')}`);
  console.error(`${b(' ⡜     ⡜')}   ${b('walkerOS')}`);
  console.error(`${b('⡜  ⡜  ⡜')}    v${version}`);
  console.error('');

  // === Option 4b: Braille thick ⡼ ===
  console.error(g('--- 4b: Braille thick ⡼ ---'));
  console.error(`${b('        ⡼')}`);
  console.error(`${b(' ⡼     ⡼')}   ${b('walkerOS')}`);
  console.error(`${b('⡼  ⡼  ⡼')}    v${version}`);
}
