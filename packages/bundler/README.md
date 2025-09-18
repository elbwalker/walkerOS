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
      "name": "@walkeros/core",
      "version": "latest"
    }
  ],
  "content": "import { getId, getByPath } from '@walkeros/core'; export function generateSessionId() { return `session_${getId(8)}`; } export function extractUserName(data) { return getByPath(data, 'user.name', 'Anonymous'); }",
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
- **content**: JavaScript code to include in the bundle
- **build**: Build configuration (optional)
  - `platform`: Target platform - "browser", "node", or "neutral" (default:
    "browser")
  - `format`: Output format - "esm", "cjs", "umd", or "iife" (default: "esm")
  - `target`: ECMAScript target (e.g., "es2018", "node18")
  - `minify`: Enable minification (default: false)
  - `sourcemap`: Generate source maps (default: false)
- **template**: Template configuration (optional)
  - `content`: Inline template string
  - `file`: Path to external template file
  - `variables`: Template variables (supports strings, numbers, booleans, and
    arrays)
  - `contentPlaceholder`: Content insertion point (default: "{{CONTENT}}")
  - `variablePattern`: Custom variable delimiters (default: "{{" and "}}")
- **output**: Output configuration
  - `filename`: Output filename (default: "bundle.js")
  - `dir`: Output directory (default: "./dist")

## Examples

### Minimal Bundle

```json
{
  "packages": [{ "name": "@walkeros/core", "version": "latest" }],
  "content": "import { getId } from '@walkeros/core'; export const generateId = () => getId(8);",
  "output": {
    "filename": "minimal.js"
  }
}
```

### Node.js Bundle

```json
{
  "packages": [{ "name": "@walkeros/core", "version": "latest" }],
  "content": "import { getId, getByPath } from '@walkeros/core'; export function generateSessionId() { return `session_${getId(12)}`; } export function extractConfigValue(config, path) { return getByPath(config, path, 'default'); }",
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
  "packages": [{ "name": "@walkeros/core", "version": "latest" }],
  "content": "import { getId, getByPath, clone, trim } from '@walkeros/core'; export function processData(data) { return data.map(item => ({ ...item, id: getId(8), timestamp: new Date().toISOString().split('T')[0], processed: true })); } export function extractNestedValues(data, path) { return data.map(item => getByPath(item, path, null)).filter(val => val !== null); } export function deepCloneData(data) { return clone(data); }",
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

### Template with Array Loops

```json
{
  "packages": [{ "name": "@walkeros/core", "version": "latest" }],
  "content": "export { getId, trim } from '@walkeros/core';",
  "template": {
    "content": "// Auto-generated bundle\n{{#imports}}import { {{name}} } from '{{package}}';\n{{/imports}}\n\n{{CONTENT}}\n\n// Available utilities: {{#utilities}}{{this}}, {{/utilities}}",
    "variables": {
      "imports": [
        { "name": "getId", "package": "@walkeros/core" },
        { "name": "trim", "package": "@walkeros/utils" }
      ],
      "utilities": ["getId", "trim", "createEvent"]
    }
  },
  "output": {
    "filename": "templated-bundle.js"
  }
}
```

## Template System

The bundler supports a powerful templating system with variable substitution and
array loops:

### Variables

- **Simple variables**: `{{variableName}}`
- **Array loops**: `{{#arrayName}}...{{/arrayName}}`
- **Object properties**: `{{name}}`, `{{nested.property}}`
- **Current item**: `{{this}}` (for primitive arrays)
- **Array index**: `{{@index}}`

### Loop Examples

```javascript
// Object array
{{#imports}}
import { {{name}} } from '{{package}}';
{{/imports}}

// Primitive array
{{#tags}}
Tag: {{this}}
{{/tags}}

// With index
{{#items}}
Item {{@index}}: {{name}}
{{/items}}
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
- ✅ Template system with variable substitution and array loops

## Package Variable Names

Package names are automatically sanitized to valid JavaScript variable names:

- `@walkeros/core` → `_walkeros_core`
- `dayjs` → `dayjs`
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
