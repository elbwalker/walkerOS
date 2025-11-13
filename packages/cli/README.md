# @walkeros/cli

walkerOS CLI - Bundle and simulate walkerOS components

## Overview

The walkerOS CLI provides tools for bundling NPM packages with custom code and
simulating event processing for development and testing.

## Installation

```bash
npm install @walkeros/cli
```

## Commands

### Bundle Command

Bundle NPM packages with custom code into optimized JavaScript files:

```bash
walkeros bundle [options]
```

**Options:**

- `-c, --config <path>` - Configuration file path (default:
  `bundle.config.json`)
- `-s, --stats` - Show bundle statistics
- `--json` - Output statistics in JSON format (implies --stats)
- `--no-cache` - Disable package caching and download fresh packages
- `-v, --verbose` - Verbose output

**Examples:**

```bash
# Basic bundle
walkeros bundle

# With custom config and stats
walkeros bundle -c my-config.json --stats --verbose

# JSON output for CI/CD
walkeros bundle --json
```

### Simulate Command

Simulate event processing and capture API calls for development and debugging:

```bash
walkeros simulate [options]
```

**Options:**

- `-c, --config <path>` - Bundle configuration file (default:
  `bundle.config.json`)
- `-e, --event <json>` - Event to simulate (JSON string)
- `--json` - Output results as JSON
- `-v, --verbose` - Verbose output

**Examples:**

```bash
# Simulate a product view event
walkeros simulate -e '{"name":"product view","data":{"id":"P123","price":99.99}}'

# With custom config and JSON output
walkeros simulate -c ecommerce-config.json --json --verbose
```

## Configuration

### Bundle Configuration

Create a `bundle.config.json` file:

```json
{
  "packages": [
    {
      "name": "@walkeros/core",
      "version": "^0.1.2",
      "imports": ["startFlow", "createEvent"]
    },
    {
      "name": "@walkeros/web-destinations-gtag",
      "version": "^0.1.0",
      "imports": ["destinationGtag"]
    }
  ],
  "sources": [
    {
      "name": "browser",
      "config": {
        "globalsOnly": true
      }
    }
  ],
  "destinations": [
    {
      "name": "gtag",
      "config": {
        "settings": {
          "ga4": {
            "measurementId": "G-XXXXXXXXXX"
          }
        }
      }
    }
  ],
  "content": "// Custom initialization code",
  "output": {
    "filename": "walkeros-bundle.js",
    "dir": "./dist"
  },
  "build": {
    "platform": "browser",
    "format": "esm",
    "minify": true
  }
}
```

### Key Configuration Sections

- **`packages`** - NPM packages to include with specific imports
- **`sources`** - Data collection sources (browser, dataLayer, etc.)
- **`destinations`** - Analytics/marketing destinations (gtag, Meta, etc.)
- **`content`** - Custom JavaScript code to include
- **`output`** - Bundle output configuration
- **`build`** - Build options (platform, format, minification)

## Development Workflow

### 1. Bundle Your Configuration

```bash
walkeros bundle -c config.json --stats
```

### 2. Test with Simulation

```bash
walkeros simulate -e '{"name":"page view","data":{"title":"Home"}}'
```

### 3. Production Build

```bash
walkeros bundle -c config.json --json > build-info.json
```

## Architecture

The CLI is organized into focused modules:

- **`core/`** - Shared utilities (logger, timer, output formatting)
- **`bundle/`** - Package bundling and code generation
- **`simulate/`** - Event simulation and API call tracking

### Logger System

All output uses a consistent logging system:

```typescript
import { createLogger } from '@walkeros/cli/core';

const logger = createLogger({
  verbose: true,
  silent: false,
  json: false,
});

logger.info('Starting process...');
logger.success('Process completed!');
logger.error('Something went wrong');
```

## API

### Programmatic Usage

The CLI provides high-level functions for programmatic usage in Node.js
applications like Docker containers, build scripts, and testing frameworks.

#### Basic Example

```typescript
import { bundle, simulate } from '@walkeros/cli';
import type {
  BundleConfig,
  BundleStats,
  SimulationResult,
} from '@walkeros/cli';

// Bundle with config object
const config: BundleConfig = {
  platform: 'web',
  packages: {
    '@walkeros/core': {
      version: '^0.1.2',
      imports: ['startFlow', 'createEvent'],
    },
    '@walkeros/web-destination-gtag': {
      imports: ['destinationGtag'],
    },
  },
  code: 'export const tracker = startFlow({ /* ... */ });',
  output: './dist/walker.js',
  build: {
    platform: 'browser',
    format: 'esm',
    minify: true,
  },
};

// Bundle and get stats
const stats: BundleStats = await bundle(config, {
  stats: true,
  verbose: false,
  silent: false,
});

console.log(`Bundle size: ${stats.totalSize} bytes`);

// Simulate event processing
const result: SimulationResult = await simulate(
  './bundle.config.json',
  { name: 'product view', data: { id: 'P123', price: 99.99 } },
  { json: true },
);

console.log(result.captures); // View captured API calls
```

#### Bundle Function

```typescript
function bundle(
  configOrPath: BundleConfig | string,
  options?: {
    silent?: boolean; // Suppress output (default: false)
    verbose?: boolean; // Detailed logging (default: false)
    stats?: boolean; // Return bundle statistics (default: false)
    cache?: boolean; // Enable package caching (default: true)
  },
): Promise<BundleStats | void>;
```

**Examples:**

```typescript
// With config file path
await bundle('./config.json', { stats: true });

// With config object
await bundle({
  platform: 'server',
  packages: { '@walkeros/core': { imports: ['createEvent'] } },
  code: 'export default createEvent;',
  output: './dist/bundle.js',
  build: { platform: 'node', format: 'esm' },
});

// Silent mode for CI/CD
const stats = await bundle(config, { silent: true, stats: true });
if (stats.totalSize > 1000000) {
  throw new Error('Bundle too large!');
}
```

#### Simulate Function

```typescript
function simulate(
  configPath: string,
  event: unknown,
  options?: {
    silent?: boolean; // Suppress output (default: false)
    verbose?: boolean; // Detailed logging (default: false)
    json?: boolean; // Return JSON result (default: false)
  },
): Promise<SimulationResult>;
```

**Note:** Currently only supports config file paths. Config object support will
be added in a future version.

**Examples:**

```typescript
// Test product view tracking
const result = await simulate(
  './ecommerce.config.json',
  {
    name: 'product view',
    data: { id: 'P123', name: 'Laptop', price: 999.99 },
  },
  { json: true },
);

// Check if gtag was called correctly
const gtagCalls = result.captures.filter((c) => c.destination === 'gtag');
expect(gtagCalls[0].payload).toEqual({
  event: 'view_item',
  item_id: 'P123',
  value: 999.99,
});

// Verbose debugging
await simulate('./config.json', event, { verbose: true });
```

#### CLI Commands (Advanced)

For advanced use cases requiring direct access to CLI commands:

```typescript
import { bundleCommand, simulateCommand } from '@walkeros/cli';

// Access CLI command directly (handles process.exit, argument parsing, etc.)
await bundleCommand({
  config: 'config.json',
  stats: true,
  verbose: true,
});
```

## License

MIT
