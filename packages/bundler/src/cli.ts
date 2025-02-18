#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { bundler } from './index.js';

async function main() {
  try {
    // Get config file path from arguments
    const configPath = process.argv[2];
    if (!configPath) {
      throw new Error('Please provide a config file path');
    }

    // Read and parse config file
    const configContent = fs.readFileSync(path.resolve(configPath), 'utf-8');
    const config = JSON.parse(configContent);

    // Validate config
    if (!config.name || !config.message) {
      throw new Error('Config must include "name" and "message" fields');
    }

    // Generate bundle
    const output = await bundler(config);

    // Write to output file
    const outputPath = path.join(process.cwd(), 'bundle.js');
    fs.writeFileSync(outputPath, output);

    console.log(`Bundle successfully created at ${outputPath}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
