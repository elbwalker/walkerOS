import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { pathToFileURL } from 'url';

const baseConfig = {
  entry: ['src/index.ts'],
  minify: 'terser',
  splitting: false,
};

// Modules
const buildModules = (customConfig = {}) => {
  // Auto-inject package version
  let version = '0.0.0';
  try {
    const packagePath = resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    version = pkg.version || '0.0.0';
  } catch (error) {
    console.warn('Could not read package.json for version injection:', error.message);
  }

  return {
    ...baseConfig,
    clean: false,
    format: ['cjs', 'esm'],
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.js' };
    },
    dts: true,
    sourcemap: true,
    declaration: true,
    declarationMap: true,
    define: {
      __VERSION__: JSON.stringify(version),
      ...customConfig.define,
    },
    ...customConfig,
  };
};

// Examples
const buildExamples = (customConfig = {}) => ({
  ...baseConfig,
  entry: { 'examples/index': 'src/examples/index.ts' },
  dts: true,
  minify: false,
  format: ['cjs', 'esm'],
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.js' };
  },
  ...customConfig,
});

// Browser
const buildBrowser = (customConfig = {}) => ({
  ...baseConfig,
  format: ['iife'],
  outExtension() {
    return { js: `.browser.js` };
  },
  ...customConfig,
});

// ES5
const buildES5 = (customConfig = {}) => ({
  ...baseConfig,
  format: ['iife'],
  target: 'es5',
  outExtension() {
    return { js: `.es5.js` };
  },
  ...customConfig,
});

/**
 * Deep-clone a value for JSON serialization.
 *
 * Conventions:
 * - Functions → { $code: fn.toString() } — serialized source for documentation, not executable
 * - Zod instances → filtered out (returns undefined)
 *   Zod 3: detected via _def.typeName starting with 'Zod'
 *   Zod 4: detected via _zod property
 * - Everything else → recursively passed through
 */
const toSerializable = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'function') return { $code: value.toString() };
  if (
    typeof value === 'object' &&
    (value._def?.typeName?.startsWith?.('Zod') || '_zod' in value)
  )
    return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item));
  }
  if (typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      const serialized = toSerializable(val);
      if (serialized !== undefined) result[key] = serialized;
    }
    return result;
  }
  return value;
};

// Dev build: builds src/dev.ts and generates walkerOS.json
const buildDev = (customConfig = {}) => {
  const { onSuccess: customOnSuccess, ...restConfig } = customConfig;

  const modulesConfig = buildModules({
    entry: ['src/dev.ts'],
    ...restConfig,
  });

  return {
    ...modulesConfig,
    async onSuccess() {
      const cwd = process.cwd();
      const packagePath = resolve(cwd, 'package.json');
      let pkg = { name: 'unknown', version: '0.0.0' };
      try {
        pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
      } catch (error) {
        console.warn('[buildDev] Could not read package.json:', error.message);
      }

      // Check the built module exists
      const devMjsPath = resolve(cwd, 'dist/dev.mjs');
      if (!existsSync(devMjsPath)) {
        console.warn('[buildDev] dist/dev.mjs not found, skipping walkerOS.json generation');
        return;
      }

      // Import the built module (cache-bust for watch mode rebuilds)
      const devModulePath = pathToFileURL(devMjsPath).href;
      let devModule;
      try {
        devModule = await import(`${devModulePath}?t=${Date.now()}`);
      } catch (error) {
        console.warn(
          `[buildDev] Could not import dist/dev.mjs: ${error.message}. Skipping walkerOS.json generation`,
        );
        return;
      }

      // Extract schemas (Zod instances filtered by toSerializable)
      const schemas = toSerializable(devModule.schemas || {}) || {};

      // Extract examples (convert functions to $code strings)
      const rawExamples = devModule.examples || {};
      const examples = toSerializable(rawExamples) || {};

      // Build output
      const output = {
        $meta: {
          package: pkg.name,
          version: pkg.version,
          generatedAt: new Date().toISOString(),
          conventions: {
            $code: 'Serialized function source code. Not executable — for documentation and MCP context only.',
          },
        },
        schemas,
        examples,
      };

      // Validate
      if (Object.keys(schemas).length === 0) {
        console.warn('[buildDev] Warning: schemas is empty');
      }

      // Verify valid JSON roundtrip
      const jsonString = JSON.stringify(output, null, 2);
      try {
        JSON.parse(jsonString);
      } catch (error) {
        console.error(
          '[buildDev] Error: output is not valid JSON:',
          error.message,
        );
        return;
      }

      // Write to dist/dev/walkerOS.json
      const outDir = resolve(cwd, 'dist/dev');
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'walkerOS.json'), jsonString);
      console.log(
        `[buildDev] Generated dist/dev/walkerOS.json for ${pkg.name}@${pkg.version}`,
      );

      // Run custom onSuccess if provided
      if (typeof customOnSuccess === 'function') {
        await customOnSuccess();
      }
    },
  };
};

export {
  baseConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
  buildDev,
  toSerializable,
  defineConfig,
};
