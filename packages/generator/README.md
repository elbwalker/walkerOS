# WalkerOS Generator

Generate production-ready walkerOS bundles from collector configurations.

## Installation

### NPX (Recommended)

```bash
# Generate bundle directly without installation
npx @walkeros/generator --config my-config.json --output bundle.js
```

### Global Installation

```bash
# Install globally
npm install -g @walkeros/generator

# Use anywhere
walkeros-gen --config my-config.json --output bundle.js
```

### Local Installation

```bash
# Install in project
npm install --save-dev @walkeros/generator

# Use via npm scripts or npx
npx walkeros-gen --config my-config.json --output bundle.js
```

## Usage

### Basic Command

```bash
npx @walkeros/generator --config config.json --output bundle.js
```

### CLI Options

```bash
npx @walkeros/generator [options]

Options:
  -c, --config <path>   Path to configuration JSON file or JSON string (required)
  -o, --output <path>   Output path for bundle (default: ./output/result.js)
  --stdout              Output bundle to stdout instead of file
  -v, --verbose         Enable verbose logging
  --cache-dir <path>    Cache directory for downloaded packages
  --build-dir <path>    Build directory for npm installations
  --no-cache           Skip package cache
  --clean              Clean build directory before starting
  -h, --help           Display help
```

### Example Commands

**Basic bundle generation:**

```bash
npx @walkeros/generator --config examples/basic-config.json --output my-bundle.js
```

**Output to stdout:**

```bash
npx @walkeros/generator --config my-config.json --stdout > bundle.js
```

**With caching for faster builds:**

```bash
npx @walkeros/generator --config my-config.json --output bundle.js --cache-dir ~/.walkeros-cache --build-dir ./build
```

**JSON string input:**

```bash
npx @walkeros/generator --config '{"config":{"sources":{...},"destinations":{...}},"packages":[...]}' --stdout
```

## Configuration Format

The generator uses the standard walkerOS collector configuration format:

```json
{
  "config": {
    "sources": {
      "browser": {
        "code": "sourceBrowser",
        "config": {
          "settings": {
            "pageview": true,
            "click": true
          }
        }
      }
    },
    "destinations": {
      "gtag": {
        "code": "destinationGtag",
        "config": {
          "settings": {
            "ga4": {
              "measurementId": "G-XXXXXXXXXX"
            }
          }
        }
      }
    },
    "run": true
  },
  "packages": [
    {
      "name": "@walkeros/collector",
      "version": "^0.0.8"
    },
    {
      "name": "@walkeros/web-source-browser",
      "version": "^0.0.8"
    },
    {
      "name": "@walkeros/web-destination-gtag",
      "version": "^0.0.8"
    }
  ]
}
```

## Configuration Structure

### `config` (Collector.InitConfig)

Standard walkerOS collector configuration:

- **`sources`**: Source configurations using `{code, config, env}` pattern
- **`destinations`**: Destination configurations using `{code, config, env}`
  pattern
- **`run`**: Whether to auto-initialize (default: true)
- **`consent`**: Initial consent state
- **`globals`**: Global properties
- **`user`**: User identification

### `packages` (PackageDefinition[])

Array of npm packages to include:

```json
[
  {
    "name": "@walkeros/collector",
    "version": "^0.0.8"
  }
]
```

## Examples

### Basic Setup

See `examples/basic-config.json`:

```bash
npx @walkeros/generator --config examples/basic-config.json --output basic-bundle.js
```

### Advanced Setup

See `examples/demo-config.json`:

```bash
npx @walkeros/generator --config examples/demo-config.json --output advanced-bundle.js
```

### Custom Destinations with Environment

```json
{
  "config": {
    "destinations": {
      "api": {
        "code": "destinationAPI",
        "config": {
          "settings": {
            "url": "https://api.example.com/events"
          }
        },
        "env": {
          "sendWeb": "fetch"
        }
      }
    }
  }
}
```

## Generated Bundle

The generator produces a self-contained IIFE bundle:

```javascript
/*!
 * WalkerOS Bundle
 * Generated from collector configuration
 */
(function (window) {
  'use strict';

  // Package code...
  // Initialization code...

  // Exposes:
  // window.walkerOS - Collector instance
  // window.elb - Event function
})(typeof window !== 'undefined' ? window : {});
```

## Programmatic API

```typescript
import { generateWalkerOSBundle } from '@walkeros/generator';

const result = await generateWalkerOSBundle({
  config: {
    sources: {
      /* ... */
    },
    destinations: {
      /* ... */
    },
  },
  packages: [{ name: '@walkeros/collector', version: '^0.0.8' }],
  cacheOptions: {
    cacheDir: '~/.walkeros-cache',
    buildDir: './build',
  },
});

console.log(result.bundle); // Generated JavaScript code
```

## Performance Tips

1. **Use caching**: Specify `--cache-dir` and `--build-dir` for faster
   subsequent builds
2. **Persistent build directory**: Use `--build-dir` to reuse npm installations
3. **Clean builds**: Use `--clean` when updating package versions
4. **No cache**: Use `--no-cache` for development/testing

## Troubleshooting

### Package Resolution Errors

- Verify package names and versions exist on npm
- Check network connectivity
- Try clearing npm cache: `npm cache clean --force`

### Bundle Generation Errors

- Verify configuration structure matches examples
- Check that all required packages are listed
- Use `--verbose` flag for detailed logging

### Permission Errors

- Ensure write permissions for output directory
- Check cache/build directory permissions

## Related

- [@walkeros/core](../core) - Core types and utilities
- [@walkeros/collector](../collector) - Event collection engine
- [walkerOS Documentation](../../README.md) - Main project docs
