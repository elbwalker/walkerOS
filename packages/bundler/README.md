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

### Multiple Packages

```json
{
  "packages": [
    { "name": "lodash-es", "version": "4.17.21" },
    { "name": "dayjs", "version": "1.11.10" }
  ],
  "customCode": "export function processData(data) { return lodash_es.map(data, item => dayjs.default(item.date).format('YYYY-MM-DD')); }",
  "output": {
    "filename": "tracker.js",
    "dir": "./dist"
  }
}
```

## Features

- ✅ Downloads real NPM packages from registry
- ✅ Bundles packages with custom JavaScript code
- ✅ Outputs ES modules (ESM) format
- ✅ Browser-compatible bundles
- ✅ Tree-shaking optimization
- ✅ Automatic temporary file cleanup
- ✅ Package caching for faster subsequent builds

## Package Variable Names

Package names are automatically sanitized to valid JavaScript variable names:

- `lodash-es` → `lodash_es`
- `@walkeros/core` → `_walkeros_core`
- Special characters are replaced with underscores

## Browser Compatibility

The bundler creates browser-compatible bundles by:

- Preferring browser field over module/main in package.json
- Using ES module format
- Avoiding Node.js-specific dependencies

For packages that require Node.js built-ins (like `crypto`), consider using
browser-compatible alternatives.

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

- Multiple output formats (CJS, UMD, IIFE)
- TypeScript support for custom code
- Source maps generation
- Minification options
- Watch mode for development
- Advanced caching with TTL
- Custom esbuild plugins

## Related Packages

- **@walkeros/generator**: WalkerOS-specific bundle generator for collector
  configurations
- **@walkeros/core**: Core types and utilities for walkerOS

## License

MIT
