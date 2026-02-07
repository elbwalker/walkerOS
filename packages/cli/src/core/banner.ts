/* eslint-disable no-console */
import chalk from 'chalk';
import { BRAND_COLOR } from './logger.js';

export function printBanner(version: string): void {
  const b = chalk.hex(BRAND_COLOR);
  const g = chalk.gray;

  // === Option 1a: Single ╱ ===
  console.log(g('--- 1a: Single ╱ ---'));
  console.log(`${b('        ╱')}`);
  console.log(`${b(' ╱     ╱')}   ${b('walkerOS')}`);
  console.log(`${b('╱  ╱  ╱')}    v${version}`);
  console.log('');

  // === Option 1b: Double ╱╱ ===
  console.log(g('--- 1b: Double ╱╱ ---'));
  console.log(`${b('        ╱╱')}`);
  console.log(`${b(' ╱╱    ╱╱')}   ${b('walkerOS')}`);
  console.log(`${b('╱╱ ╱╱ ╱╱')}    v${version}`);
  console.log('');

  // === Option 4a: Braille thin ⡜ ===
  console.log(g('--- 4a: Braille thin ⡜ ---'));
  console.log(`${b('        ⡜')}`);
  console.log(`${b(' ⡜     ⡜')}   ${b('walkerOS')}`);
  console.log(`${b('⡜  ⡜  ⡜')}    v${version}`);
  console.log('');

  // === Option 4b: Braille thick ⡼ ===
  console.log(g('--- 4b: Braille thick ⡼ ---'));
  console.log(`${b('        ⡼')}`);
  console.log(`${b(' ⡼     ⡼')}   ${b('walkerOS')}`);
  console.log(`${b('⡼  ⡼  ⡼')}    v${version}`);
}
