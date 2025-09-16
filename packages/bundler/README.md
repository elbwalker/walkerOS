# @walkeros/bundler

A command-line tool that dynamically bundles NPM packages with custom code into
optimized JavaScript files.

## Installation

```bash
npm install @walkeros/bundler
```

## Usage

### Basic Command

```bash
walkeros-bundle --config bundle.config.json
```

### CLI Options

- `-c, --config <path>` - Path to configuration file (default:
  "bundle.config.json")

## Configuration

Create a `bundle.config.json` file with the following structure:

```json
{
  "packages": [
    {
      "name": "lodash-es",
      "version": "4.17.21"
    },
    {
      "name": "dayjs",
      "version": "1.11.10"
    }
  ],
  "customCode": "export function formatDate(date) { return dayjs.default(date).format('YYYY-MM-DD'); }",
  "output": {
    "filename": "bundle.js",
    "dir": "./dist"
  }
}
```

### Configuration Schema

- **packages**: Array of NPM packages to bundle
  - `name`: NPM package name
  - `version`: Package version (supports semver ranges)
- **customCode**: Custom JavaScript code to include in the bundle
- **build**: Build configuration (optional)
  - `platform`: Target platform - "browser", "node", or "neutral" (default:
    "browser")
  - `format`: Output format - "esm", "cjs", "umd", or "iife" (default: "esm")
  - `target`: ECMAScript target (e.g., "es2018", "node18")
  - `minify`: Enable minification (default: false)
  - `sourcemap`: Generate source maps (default: false)
- **output**: Output configuration
  - `filename`: Output filename (default: "bundle.js")
  - `dir`: Output directory (default: "./dist")

## Examples

### Minimal Bundle

```json
{
  "packages": [{ "name": "lodash-es", "version": "4.17.21" }],
  "customCode": "export const double = (n) => n * 2;",
  "output": {
    "filename": "minimal.js"
  }
}
```

### Node.js Bundle

```json
{
  "packages": [{ "name": "dayjs", "version": "1.11.10" }],
  "customCode": "export function getCurrentTime() { return dayjs.default().format('YYYY-MM-DD HH:mm:ss'); }",
  "build": {
    "platform": "node",
    "format": "cjs",
    "target": "node18"
  },
  "output": {
    "filename": "node-utils.js",
    "dir": "./dist"
  }
}
```

### Advanced Configuration

```json
{
  "packages": [
    { "name": "lodash-es", "version": "4.17.21" },
    { "name": "dayjs", "version": "1.11.10" }
  ],
  "customCode": "export function processData(data) { return lodash_es.map(data, item => ({ ...item, timestamp: dayjs.default().format('YYYY-MM-DD'), processed: true })); }",
  "build": {
    "platform": "browser",
    "format": "esm",
    "target": "es2020",
    "minify": true,
    "sourcemap": true
  },
  "output": {
    "filename": "advanced-bundle.js",
    "dir": "./dist"
  }
}
```

## Features

- ✅ Downloads real NPM packages from registry
- ✅ Bundles packages with custom JavaScript code
- ✅ Multiple output formats (ESM, CJS, UMD, IIFE)
- ✅ Platform-specific builds (browser, Node.js, neutral)
- ✅ Tree-shaking optimization
- ✅ Minification and source maps
- ✅ Automatic temporary file cleanup
- ✅ Package caching for faster subsequent builds

## Package Variable Names

Package names are automatically sanitized to valid JavaScript variable names:

- `lodash-es` → `lodash_es`
- `@walkeros/core` → `_walkeros_core`
- Special characters are replaced with underscores

## Platform Support

### Browser Platform (`"platform": "browser"`)

Creates browser-compatible bundles with:

- Preference for browser field over module/main in package.json
- Compatible with all modern browsers
- Note: Packages requiring Node.js built-ins (crypto, fs, etc.) will need
  separate polyfills

### Node.js Platform (`"platform": "node"`)

Creates Node.js-specific bundles with:

- Node.js built-ins marked as external (not bundled)
- Optimized for server-side usage
- Direct access to crypto, fs, path, and other Node modules
- Default CommonJS format for Node compatibility

### Neutral Platform (`"platform": "neutral"`)

Creates platform-agnostic bundles:

- No platform-specific optimizations
- Works in both browser and Node.js environments
- Best for utility libraries without platform dependencies

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev -- --config examples/bundle.config.json
```

### Test

```bash
npm test
```

## Architecture

The bundler follows this workflow:

1. **Configuration Loading**: Parse and validate JSON configuration
2. **Package Resolution**: Download packages from NPM registry using pacote
3. **Entry Point Generation**: Create virtual entry point with imports and
   custom code
4. **Bundling**: Use esbuild to create optimized bundle
5. **Output**: Write bundle to specified location
6. **Cleanup**: Remove temporary files

## Future Enhancements

Planned features for future versions:

- TypeScript support for custom code
- Watch mode for development
- Advanced caching with TTL
- Custom esbuild plugins
- Bundle analysis and size reporting
- Code splitting for large bundles
- Tree-shaking customization

## Related Packages

- **@walkeros/generator**: WalkerOS-specific bundle generator for collector
  configurations
- **@walkeros/core**: Core types and utilities for walkerOS

## License

MIT
