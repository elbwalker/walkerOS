import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync, readFileSync } from 'fs';

const packagesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '/',
);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getModuleMapper() {
  const mapper = {};

  function scanForPackages(dir) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;

      const fullPath = path.join(dir, entry.name);
      const pkgJsonPath = path.join(fullPath, 'package.json');

      if (existsSync(pkgJsonPath)) {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

        if (pkg.name?.startsWith('@walkeros/') && existsSync(path.join(fullPath, 'src'))) {
          // Map root export: @walkeros/core → packages/core/src/
          mapper[`^${escapeRegex(pkg.name)}$`] = path.join(fullPath, 'src/');

          // Map subpath exports: @walkeros/core/dev → packages/core/src/dev
          if (pkg.exports) {
            for (const subpath of Object.keys(pkg.exports)) {
              if (subpath === '.' || !subpath.startsWith('./')) continue;
              const subName = subpath.slice(2);
              const srcFile = path.join(fullPath, 'src', subName);
              if (
                existsSync(srcFile + '.ts') ||
                existsSync(srcFile + '.tsx') ||
                existsSync(path.join(srcFile, 'index.ts'))
              ) {
                mapper[`^${escapeRegex(pkg.name)}/${escapeRegex(subName)}$`] = srcFile;
              }
            }
          }
        }
      }

      // Recurse into subdirectories (handles packages/web/core/, packages/server/destinations/api/, etc.)
      scanForPackages(fullPath);
    }
  }

  scanForPackages(path.join(packagesDir, 'packages'));
  return mapper;
}

function getGlobals() {
  // Auto-inject package version for tests
  let version = '0.0.0';
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    version = pkg.version || '0.0.0';
  } catch (error) {
    console.warn('Could not read package.json for version injection in tests:', error.message);
  }

  return {
    __VERSION__: version,
  };
}

const config = {
  transform: {
    '^.+\\.(t|j|mj)sx?$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2022',
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
        },
        module: {
          type: 'es6',
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(@walkeros)/)'],
  testMatch: ['<rootDir>/**/*.test.(ts|tsx|js|jsx)'],
  moduleFileExtensions: ['js', 'ts', 'tsx', 'mjs', 'json'],
  rootDir: '.',
  moduleDirectories: ['node_modules', 'src', path.join(packagesDir, 'node_modules')],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: getModuleMapper(),
  globals: getGlobals(),
  
  // Performance settings - reduced for devcontainer memory constraints
  maxWorkers: 2,
  testTimeout: 30000,
  // forceExit disabled to allow proper cleanup and detect handle leaks
  clearMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  
  // Exclude from module resolution (prevents Haste collisions with cached packages)
  modulePathIgnorePatterns: ['<rootDir>/.tmp', '/dist/'],

  // Enhanced ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '.tmp',
  ],
};

export default config;
