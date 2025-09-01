# @walkeros/generator

Generate walkerOS bundles from Flow configurations.

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

Creates a complete IIFE bundle with:

- Real walkerOS package code from npm
- Auto-initialization on DOM ready
- Global `window.walkerOS` and `window.elb` exposure
- Collector configuration from Flow nodes

## CLI Usage

After building the package:

```bash
# Install dependencies and build
npm install && npm run build

# Generate bundle from file to stdout
walkeros-gen --flow config.json

# Generate bundle from JSON string to stdout
walkeros-gen --flow '{"packages":[...],"nodes":[...],"edges":[...]}'

# Generate bundle to file with verbose output
walkeros-gen --flow config.json --output bundle.js --verbose

# Generate bundle from JSON string to file
walkeros-gen --flow '{"packages":[...]}' --output bundle.js --verbose

# Use package caching to speed up subsequent runs (NEW!)
walkeros-gen --flow config.json --cache-dir ~/.walkeros-cache

# Keep build artifacts for inspection (NEW!)
walkeros-gen --flow config.json --build-dir ./build-output

# Skip cleanup of temporary directories for debugging (NEW!)
walkeros-gen --flow config.json --no-cleanup

# Combine options for optimal development workflow
walkeros-gen --flow config.json --output bundle.js --cache-dir ~/.walkeros-cache --build-dir ./build --verbose

# Help and version
walkeros-gen --help
walkeros-gen --version
```

## Input Formats

### File Input

```bash
walkeros-gen --flow config.json
```

### JSON String Input (NEW!)

```bash
walkeros-gen --flow '{"packages":[...],"nodes":[...],"edges":[...]}'
```

The CLI automatically detects whether your `--flow` argument is a JSON string or
file path.

## Performance Options (NEW!)

### Package Caching

Use `--cache-dir` to dramatically speed up bundle generation by caching
downloaded npm packages:

```bash
# First run: downloads packages (~3-5 seconds)
walkeros-gen --flow config.json --cache-dir ~/.walkeros-cache

# Subsequent runs: uses cached packages (~0 seconds)
walkeros-gen --flow config.json --cache-dir ~/.walkeros-cache
```

- **Cache Location**: Defaults to `~/.walkeros-cache` if not specified
- **Cache Expiry**: Cached packages expire after 24 hours
- **Cache Cleanup**: Old entries are automatically cleaned up periodically
- **Cache Stats**: Check cache size and entries in the cache directory

### Build Artifacts

Use `--build-dir` to preserve extracted package code for inspection:

```bash
walkeros-gen --flow config.json --build-dir ./build-artifacts
```

This saves:

- `extracted/` - Individual package code files
- Temporary installation directories
- Package metadata for debugging

### Debugging

Use `--no-cleanup` to preserve all temporary directories:

```bash
walkeros-gen --flow config.json --no-cleanup --verbose
```

Useful for:

- Debugging package resolution issues
- Inspecting npm installation output
- Understanding the build process

### API Usage with Cache Options

```typescript
import { generateWalkerOSBundle } from '@walkeros/generator';

const result = await generateWalkerOSBundle({
  flow: flowConfig,
  cacheOptions: {
    cacheDir: '~/.walkeros-cache', // Enable package caching
    buildDir: './build-artifacts', // Preserve build artifacts
    noCleanup: false, // Clean up temp directories
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
