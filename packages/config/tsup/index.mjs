import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { pathToFileURL } from 'url';
import { assertNoPublishedCredentials } from './credentialGuard.mjs';
import { assertExportMaps, assertStepSettings } from './exportMaps.mjs';

const baseConfig = {
  entry: ['src/index.ts'],
  minify: 'terser',
  splitting: false,
};

// Package version for the __VERSION__ define
const getVersion = () => {
  try {
    const packagePath = resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    return pkg.version || '0.0.0';
  } catch (error) {
    console.warn(
      'Could not read package.json for version injection:',
      error.message,
    );
    return '0.0.0';
  }
};

// The package's walkerOS.platform list (package.json), empty when unset
const getPlatforms = () => {
  try {
    const packagePath = resolve(process.cwd(), 'package.json');
    const platform = JSON.parse(readFileSync(packagePath, 'utf8')).walkerOS
      ?.platform;
    if (Array.isArray(platform)) return platform;
    return platform ? [platform] : [];
  } catch {
    return [];
  }
};

// ESM builds of server-only packages define `require`, so the CommonJS SDKs
// they load with require() work when the ESM build is imported directly.
// Never for a package a browser imports: `module` does not exist there.
const CREATE_REQUIRE_BANNER =
  "import { createRequire } from 'module';const require = createRequire(import.meta.url);";

const serverBanner = () => {
  const platforms = getPlatforms();
  if (!platforms.includes('server') || platforms.includes('web')) return {};
  return {
    banner: ({ format }) =>
      format === 'esm' ? { js: CREATE_REQUIRE_BANNER } : {},
  };
};

// Modules
const buildModules = (customConfig = {}) => {
  // Auto-inject package version
  const version = getVersion();

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
    ...serverBanner(),
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
  // After the spread, so a caller's define merges in and cannot drop __VERSION__
  define: {
    __VERSION__: JSON.stringify(getVersion()),
    ...customConfig.define,
  },
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

// Dev build: builds src/dev.ts and generates walkerOS.json. Every way the
// generation can fail rejects onSuccess, so the build exits non-zero.
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
      let pkg;
      try {
        pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
      } catch (error) {
        throw new Error(
          `[buildDev] cannot read ${packagePath}: ${error.message}`,
          { cause: error },
        );
      }

      // Check the built module exists
      const devMjsPath = resolve(cwd, 'dist/dev.mjs');
      if (!existsSync(devMjsPath))
        throw new Error(
          `[buildDev] ${pkg.name}: dist/dev.mjs not found, so dist/walkerOS.json cannot be generated`,
        );

      // Import the built module (cache-bust for watch mode rebuilds)
      const devModulePath = pathToFileURL(devMjsPath).href;
      let devModule;
      try {
        devModule = await import(`${devModulePath}?t=${Date.now()}`);
      } catch (error) {
        throw new Error(
          `[buildDev] ${pkg.name}: dist/dev.mjs does not import: ${error.message}`,
          { cause: error },
        );
      }

      // The one serializer, shared with the step-example runner, the one
      // package.json to $meta reading, shared with the conformance kit, and the
      // step types. Loaded here, not at the top: core itself builds with this
      // config.
      let toSerializable;
      let packageMetaOf;
      let STEP_TYPES;
      try {
        ({ toSerializable, packageMetaOf, STEP_TYPES } =
          await import('@walkeros/core/dev'));
      } catch (error) {
        throw new Error(
          `[buildDev] ${pkg.name}: @walkeros/core/dev does not import: ${error.message}`,
          { cause: error },
        );
      }

      // Extract schemas (Zod instances filtered by toSerializable)
      const schemas = toSerializable(devModule.schemas || {}) || {};
      if (Object.keys(schemas).length === 0)
        throw new Error(
          `[buildDev] ${pkg.name}: dist/dev.mjs exports no schemas`,
        );

      // Extract examples (convert functions to $code strings)
      const rawExamples = devModule.examples || {};
      const examples = toSerializable(rawExamples) || {};

      // $meta: name, version, the walkerOS field and the source URL
      const walkerOS = pkg.walkerOS || {};
      let meta;
      try {
        meta = packageMetaOf(pkg);
      } catch (error) {
        throw new Error(`[buildDev] ${error.message}`, { cause: error });
      }

      // Extract hints (optional)
      const hints = devModule.hints
        ? toSerializable(devModule.hints)
        : undefined;

      const output = { $meta: meta, schemas, examples };

      // Multi-export packages ship examples per export, keyed by export name
      if (devModule.exportExamples) {
        const exportExamples = toSerializable(devModule.exportExamples);
        if (exportExamples && Object.keys(exportExamples).length > 0)
          output.exportExamples = exportExamples;
      }

      // Multi-export packages ship schemas per export, same shape as schemas
      if (devModule.exportSchemas) {
        const exportSchemas = toSerializable(devModule.exportSchemas);
        if (exportSchemas && Object.keys(exportSchemas).length > 0)
          output.exportSchemas = exportSchemas;
      }

      if (hints && Object.keys(hints).length > 0) {
        output.hints = hints;
      }

      // Published metadata must never carry a real credential: fail the build
      assertNoPublishedCredentials(pkg.name, {
        examples: output.examples,
        exportExamples: output.exportExamples,
        hints: output.hints,
      });

      // Per-export maps match walkerOS.exports; step packages ship settings
      assertExportMaps(pkg.name, walkerOS.exports, {
        exportExamples: output.exportExamples,
        exportSchemas: output.exportSchemas,
      });
      assertStepSettings(pkg.name, walkerOS.type, schemas, STEP_TYPES);

      // Verify valid JSON roundtrip
      let jsonString;
      try {
        jsonString = JSON.stringify(output, null, 2);
        JSON.parse(jsonString);
      } catch (error) {
        throw new Error(
          `[buildDev] ${pkg.name}: walkerOS.json is not valid JSON: ${error.message}`,
          { cause: error },
        );
      }

      // Write to dist/walkerOS.json
      const outDir = resolve(cwd, 'dist');
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'walkerOS.json'), jsonString);
      console.log(
        `[buildDev] Generated dist/walkerOS.json for ${pkg.name}@${pkg.version}`,
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
  defineConfig,
};
