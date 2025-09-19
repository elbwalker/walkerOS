# @walkeros/bundler

Bundle NPM packages with custom code into production-ready JavaScript files.
Perfect for creating ready-to-deploy walkerOS collectors for browsers, Node.js,
and serverless environments.

## 🎯 Purpose

The bundler solves a critical need: creating single-file, self-contained
JavaScript bundles that combine walkerOS packages with custom configuration.
These bundles are:

- **Deploy-ready**: Drop into Lambda, Docker, or edge functions
- **Self-contained**: All dependencies bundled
- **Optimized**: Tree-shaken and minified
- **Flexible**: Support browser, Node.js, and serverless targets

## ⚡ Features

- ✅ **Template-based generation** - Handlebars templates for collector
  initialization
- ✅ **Multi-platform** - Browser (IIFE), Node.js (ESM/CJS), serverless
- ✅ **Tree-shaking** - Only bundle what's used
- ✅ **Production-ready** - Minification, sourcemaps, optimizations
- ✅ **NPM packages** - Download and bundle any NPM package
- ✅ **Custom code** - Mix packages with your business logic

## 📦 Installation

```bash
npm install @walkeros/bundler
```

## 🚀 Usage

```bash
# Generate browser collector
walkeros-bundle -c examples/web.config.json

# Generate Node.js/serverless collector
walkeros-bundle -c examples/server.config.json

# Bundle utilities
walkeros-bundle -c examples/node.config.json
```

## 🔧 Configuration

### Browser Bundle (web.config.json)

```json
{
  "packages": [
    { "name": "@walkeros/collector", "version": "latest" },
    { "name": "@walkeros/web-source-browser", "version": "latest" }
  ],
  "content": "import { createCollector } from '@walkeros/collector';",
  "template": {
    "file": "templates/web.hbs"
  },
  "build": {
    "platform": "browser",
    "format": "iife",
    "target": "es2020",
    "minify": true
  },
  "output": {
    "filename": "walker.js",
    "dir": "./dist"
  }
}
```

### Server Bundle (server.config.json)

```json
{
  "packages": [
    { "name": "@walkeros/collector", "version": "latest" },
    { "name": "@walkeros/server-destination-aws", "version": "latest" }
  ],
  "content": "import { createCollector } from '@walkeros/collector';",
  "template": {
    "file": "templates/server.hbs"
  },
  "build": {
    "platform": "node",
    "format": "esm",
    "target": "node18"
  },
  "output": {
    "filename": "server-collector.mjs",
    "dir": "./dist"
  }
}
```

## 📁 Project Structure

```
packages/bundler/
├── src/
│   ├── bundler.ts         # Core bundling logic with esbuild
│   ├── config.ts          # Configuration schema (Zod)
│   ├── package-manager.ts # NPM package downloading (pacote)
│   └── template-engine.ts # Handlebars template processing
├── templates/
│   ├── web.hbs           # Browser collector template
│   └── server.hbs        # Node.js/serverless template
├── examples/
│   ├── web.config.json   # Browser configuration
│   ├── server.config.json # Server configuration
│   └── node.config.json  # Utility bundle configuration
└── dist/                 # Generated bundles
```

## 🎯 How It Works

1. **Download packages** - Fetch NPM packages to temp directory
2. **Apply template** - Process Handlebars template with variables
3. **Bundle with esbuild** - Create optimized single-file bundle
4. **Output** - Write production-ready file

### Templates

Templates use Handlebars syntax to generate initialization code:

```handlebars
{{CONTENT}}

const config = { sources: {
{{#sources}}
  {{name}}: { code:
  {{{code}}}, config:
  {{{config}}}
  },
{{/sources}}
}, destinations: {
{{#destinations}}
  {{name}}: { code:
  {{{code}}}, config:
  {{{config}}}
  }
{{/destinations}}
} }; // Initialize and export let collector, elb; (async () => { const result =
await createCollector(config); collector = result.collector; elb = result.elb;
})(); export { collector, elb };
```

## 🚢 Deployment Examples

### AWS Lambda

```javascript
import { elb } from './server-collector.mjs';

export const handler = async (event) => {
  await elb('lambda invoke', { source: event.source });
  return { statusCode: 200 };
};
```

### Docker

```dockerfile
FROM node:18-alpine
COPY dist/server-collector.mjs /app/
CMD ["node", "/app/server-collector.mjs"]
```

### Edge Function

```javascript
import { elb } from './server-collector.mjs';

export default async function (request) {
  await elb('edge request', { url: request.url });
  return new Response('OK');
}
```

## 📝 TODOs

- [ ] TypeScript support in custom content
- [ ] Watch mode for development
- [ ] Bundle size analysis
- [ ] Multiple entry points
- [ ] Custom esbuild plugins
- [ ] Framework-specific templates (Next.js, Remix, etc.)
- [ ] Edge runtime optimizations

## Development

```bash
# Build
npm run build

# Test
npm run test

# Clean
npm run clean
```

## License

MIT
