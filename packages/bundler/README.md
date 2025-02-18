# @elbwalker/bundler

A lightweight tool that bundles your project configuration into a single, optimized JavaScript file.

## Features

- Simple configuration using JSON
- Handlebars templating support
- Minified output using esbuild
- Use via CLI or as a package
- ESM support

## Installation

```bash
# Install globally for CLI usage
npm install -g @elbwalker/bundler

# Or install as a package dependency
npm install @elbwalker/bundler
```

## Usage

### CLI Usage

1. Create a configuration file (e.g., `config.json`):
```json
{
  "name": "My Project",
  "message": "v1.0.0"
}
```

2. Run the bundler:
```bash
# Using npx
npx @elbwalker/bundler config.json

# Or if installed globally
bundler config.json
```

This will create a `bundle.js` file in your current directory.

### Package Usage

```javascript
import { bundler } from '@elbwalker/bundler';

const config = {
  name: 'My Project',
  message: 'v1.0.0'
};

// Generate bundle
const output = await bundler(config);

// Use the output directly
console.log(output);

// Or save to a file
import { writeFileSync } from 'fs';
writeFileSync('bundle.js', output);
```

### Configuration

The configuration object requires two fields:
- `name`: The name of your project
- `message`: A version or message string

## Output

The bundler generates a minified JavaScript file that includes your configuration. When executed, it will output your configuration in a standardized format.

Example output when running the generated bundle:
```javascript
// Console output
Project configuration: { name: "My Project", message: "v1.0.0" }
```

## Development

```bash
# Build the project
npm run build

# Run with example
npm start
```

## License

MIT
