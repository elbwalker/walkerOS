# @walkeros/generator

Generate walkerOS bundles from Flow configurations.

**Quick Start:** Use `npm run walkeros-gen -- [options]` to run the CLI (after
building)

## Installation

```bash
npm install @walkeros/generator
```

## Usage

```typescript
import { generateWalkerOSBundle } from '@walkeros/generator';
import type { Flow } from '@walkeros/core';

const flowConfig: Flow.Config = {
  packages: [
    { name: '@walkeros/core', version: '0.0.8', type: 'core' },
    { name: '@walkeros/collector', version: '0.0.8', type: 'collector' },
    { name: '@walkeros/web-source-browser', version: '0.0.9', type: 'source' },
    {
      name: '@walkeros/web-destination-gtag',
      version: '0.0.8',
      type: 'destination',
    },
  ],
  nodes: [
    {
      id: 'browser-source',
      type: 'source',
      package: '@walkeros/web-source-browser',
      config: { domain: 'example.com', autoTracking: true },
    },
    {
      id: 'collector',
      type: 'collector',
      package: '@walkeros/collector',
      config: { consent: { functional: true }, queue: true },
    },
    {
      id: 'gtag-destination',
      type: 'destination',
      package: '@walkeros/web-destination-gtag',
      config: { measurementId: 'G-XXXXXXXXXX' },
    },
  ],
  edges: [
    {
      id: 'browser-to-collector',
      source: 'browser-source',
      target: 'collector',
    },
    {
      id: 'collector-to-gtag',
      source: 'collector',
      target: 'gtag-destination',
    },
  ],
};

const result = await generateWalkerOSBundle({ flow: flowConfig });
// result.bundle contains ready-to-use IIFE JavaScript
```

## Generated Bundle

Creates a complete IIFE bundle file with:

- Real walkerOS package code from npm
- Auto-initialization on DOM ready
- Global `window.walkerOS` and `window.elb` exposure
- Collector configuration from Flow nodes
- **Default output**: `./output/result.js` (always written to disk)

## CLI Usage

### Getting Started

```bash
# Install dependencies and build
npm install && npm run build

# Test with the basic example (writes to ./output/result.js)
npm run walkeros-gen -- --flow examples/basic.json --build-dir ./workspace --verbose
```

### Output Behavior

**By default, the CLI always writes the bundle to `./output/result.js`**:

- ✅ **Default**: Bundle written to `./output/result.js`
- ✅ **Custom file**: Use `--output custom.js` to write elsewhere
- ✅ **Stdout only**: Use `--stdout` to output to console instead of file

The generated file is the primary result and can be immediately used in web
applications.

### All Commands

```bash
# Generate bundle from file (default: writes to ./output/result.js)
npm run walkeros-gen -- --flow config.json

# Generate bundle from JSON string (default: writes to ./output/result.js)
npm run walkeros-gen -- --flow '{"packages":[...],"nodes":[...],"edges":[...]}'

# Generate bundle to custom file with verbose output
npm run walkeros-gen -- --flow config.json --output bundle.js --verbose

# Generate bundle to stdout instead of file
npm run walkeros-gen -- --flow config.json --stdout

# Use persistent build directory (recommended for development, default: ./tmp)
npm run walkeros-gen -- --flow config.json --build-dir ./walkeros-workspace

# Use package caching to speed up subsequent runs
npm run walkeros-gen -- --flow config.json --cache-dir ~/.walkeros-cache --build-dir ./workspace

# Force fresh download by cleaning build directory
npm run walkeros-gen -- --flow config.json --build-dir ./workspace --clean

# Skip cache but reuse build directory installations
npm run walkeros-gen -- --flow config.json --build-dir ./workspace --no-cache

# Optimal development workflow (cache + persistent workspace)
npm run walkeros-gen -- --flow config.json --output bundle.js --cache-dir ~/.walkeros-cache --build-dir ./workspace --verbose

# Help and version
npm run walkeros-gen -- --help
npm run walkeros-gen -- --version
```

## Input Formats

### File Input

```bash
npm run walkeros-gen -- --flow config.json
```

### JSON String Input (NEW!)

```bash
npm run walkeros-gen -- --flow '{"packages":[...],"nodes":[...],"edges":[...]}'
```

The CLI automatically detects whether your `--flow` argument is a JSON string or
file path.

## Performance & Development Options

### Persistent Build Directory (Recommended)

Use `--build-dir` to create a persistent workspace that avoids wasteful
re-downloads:

```bash
# First run: downloads and installs packages (~3-5 seconds)
npm run walkeros-gen -- --flow config.json --build-dir ./workspace --verbose

# Subsequent runs: reuses installations (~1 second)
npm run walkeros-gen -- --flow config.json --build-dir ./workspace --verbose
```

**What gets saved:**

- `node_modules/` - npm package installations (reused between runs)
- `extracted/` - Processed package code files
- All build artifacts for inspection

### Package Caching

Add `--cache-dir` for even faster subsequent runs across different projects:

```bash
# Combines build directory + global package cache
npm run walkeros-gen -- --flow config.json --build-dir ./workspace --cache-dir ~/.walkeros-cache
```

### Build Control Flags

```bash
# Force fresh download (clean workspace)
npm run walkeros-gen -- --flow config.json --build-dir ./workspace --clean

# Skip global cache but reuse build directory
npm run walkeros-gen -- --flow config.json --build-dir ./workspace --no-cache

# Temporary directory mode (no persistence)
npm run walkeros-gen -- --flow config.json  # No --build-dir specified
```

### Manual Testing Commands

Create these example Flow configurations for testing:

**Basic Flow (`examples/basic.json`):**

```json
{
  "packages": [
    { "name": "@walkeros/core", "version": "0.0.8", "type": "core" },
    { "name": "@walkeros/collector", "version": "0.0.8", "type": "collector" }
  ],
  "nodes": [
    {
      "id": "collector",
      "type": "collector",
      "package": "@walkeros/collector",
      "config": { "consent": { "functional": true } }
    }
  ],
  "edges": []
}
```

**Test Commands:**

```bash
# Test basic functionality
npm run walkeros-gen -- --flow examples/basic.json --build-dir ./test-basic --output basic.js --verbose

# Test performance (first vs second run)
time npm run walkeros-gen -- --flow examples/basic.json --build-dir ./perf --clean --verbose
time npm run walkeros-gen -- --flow examples/basic.json --build-dir ./perf --verbose

# Test different configs (check ./output/result.js for output)
npm run walkeros-gen -- --flow examples/basic.json --build-dir ./test-1
npm run walkeros-gen -- --flow examples/advanced.json --build-dir ./test-2

# Inspect workspace contents (output goes to ./output/result.js)
npm run walkeros-gen -- --flow examples/basic.json --build-dir ./inspect --verbose
ls -la ./inspect/node_modules/@walkeros/
ls -la ./inspect/extracted/
ls -la ./output/result.js

# Test cache vs no-cache performance
time npm run walkeros-gen -- --flow examples/basic.json --build-dir ./cache-test --cache-dir ~/.test-cache --clean
time npm run walkeros-gen -- --flow examples/basic.json --build-dir ./cache-test --cache-dir ~/.test-cache
time npm run walkeros-gen -- --flow examples/basic.json --build-dir ./cache-test --no-cache
```

### API Usage

```typescript
import { generateWalkerOSBundle } from '@walkeros/generator';

const result = await generateWalkerOSBundle({
  flow: flowConfig,
  cacheOptions: {
    buildDir: './workspace', // Persistent workspace (recommended)
    cacheDir: '~/.walkeros-cache', // Global package cache
    clean: false, // Set true to force fresh download
    noCache: false, // Set true to skip cache
  },
});
```

Example Flow configuration (`config.json` or JSON string):

```json
{
  "packages": [
    { "name": "@walkeros/core", "version": "0.0.8", "type": "core" },
    { "name": "@walkeros/collector", "version": "0.0.8", "type": "collector" },
    {
      "name": "@walkeros/web-source-browser",
      "version": "0.0.9",
      "type": "source"
    },
    {
      "name": "@walkeros/web-destination-gtag",
      "version": "0.0.8",
      "type": "destination"
    }
  ],
  "nodes": [
    {
      "id": "browser-source",
      "type": "source",
      "package": "@walkeros/web-source-browser",
      "config": { "domain": "example.com", "autoTracking": true }
    },
    {
      "id": "collector",
      "type": "collector",
      "package": "@walkeros/collector",
      "config": { "consent": { "functional": true }, "queue": true }
    },
    {
      "id": "gtag-destination",
      "type": "destination",
      "package": "@walkeros/web-destination-gtag",
      "config": { "measurementId": "G-XXXXXXXXXX" }
    }
  ],
  "edges": [
    {
      "id": "browser-to-collector",
      "source": "browser-source",
      "target": "collector"
    },
    {
      "id": "collector-to-gtag",
      "source": "collector",
      "target": "gtag-destination"
    }
  ]
}
```

## Development

```bash
npm test    # Run tests
npm run dev # Watch mode
npm run build # Build package
npm run lint  # TypeScript + ESLint
```
