# @walkeros/cli

walkerOS CLI - Bundle and deploy walkerOS components

## Overview

This unified CLI combines the functionality of `@walkeros/bundler` and
`@walkeros/deployer` into a single command-line tool. It provides two main
commands:

- `walkeros bundle` - Bundle NPM packages with custom code
- `walkeros deploy` - Deploy artifacts using driver-based architecture
  (currently simulated)

## Installation

```bash
npm install @walkeros/cli
```

## Usage

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
- `-v, --verbose` - Verbose output

**Example:**

```bash
walkeros bundle -c my-bundle.config.json --stats --verbose
```

### Deploy Command

Deploy generated walkerOS files using configured drivers:

```bash
walkeros deploy [options]
```

**Options:**

- `-c, --config <path>` - Path to config file (default: `deployer.json`)
- `--dry-run` - Preview deployment without making changes
- `--json` - Output results in JSON format
- `-v, --verbose` - Verbose output

**Example:**

```bash
walkeros deploy -c my-deployer.json --dry-run --verbose
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
      "imports": ["createEvent", "getEvent"]
    }
  ],
  "content": "console.log('Hello walkerOS');",
  "output": {
    "filename": "bundle.js",
    "dir": "./dist"
  },
  "build": {
    "platform": "browser",
    "format": "esm",
    "minify": true
  }
}
```

### Deploy Configuration

Create a `deployer.json` file:

```json
{
  "drivers": {
    "gcp": {
      "type": "ingest",
      "artifactPath": "./dist/bundle.js",
      "credentials": {
        "project": "${GCP_PROJECT_ID}"
      }
    },
    "aws": {
      "type": "ingest",
      "artifactPath": "./dist/bundle.js"
    }
  }
}
```

## Architecture

The CLI is organized into several modules:

- **`core/`** - Shared utilities including logger factory and configuration
  helpers
- **`bundle/`** - Bundling functionality migrated from `@walkeros/bundler`
- **`deploy/`** - Deployment functionality with stubbed drivers for development

### Core Logger

The unified logger provides consistent colored output:

```typescript
import { createLogger } from '@walkeros/cli/core';

const logger = createLogger({ verbose: true, silent: false, json: false });
logger.info('Starting process...');
logger.success('Process completed!');
logger.error('Something went wrong');
```

## Development Status

### Bundle Command

✅ **Fully functional** - Migrated from `@walkeros/bundler` with all features
intact

### Deploy Command

⚠️ **Simulated/Stubbed** - Currently returns fake deployment results for
development purposes

The deploy command includes stubbed drivers for:

- **GCP** - Returns fake Cloud Function URLs
- **AWS** - Returns fake Lambda URLs
- **Cloudflare** - Returns fake Worker URLs

Real driver implementations will be added in future iterations.

## Migration from Separate Packages

If you were using `@walkeros/bundler` or `@walkeros/deployer` separately:

### From @walkeros/bundler

```bash
# Old
walkeros-bundle -c config.json --stats

# New
walkeros bundle -c config.json --stats
```

### From @walkeros/deployer

```bash
# Old
walkeros-deployer deploy -c config.json

# New
walkeros deploy -c config.json
```

Configuration files remain compatible with the original packages.

## License

MIT
