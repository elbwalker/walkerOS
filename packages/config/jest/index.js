import path from 'path';
import { fileURLToPath } from 'url';

function getModuleMapper() {
  // Check if we're in watch mode (dev) or regular test mode
  const isWatchMode = process.argv.includes('--watchAll');

  // Use either src or dist folder based on watch mode
  const targetDir = isWatchMode ? '/src' : '/dist';

  const packagesDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '/',
  );

  function getDirectory(dir, target = targetDir) {
    return path.join(packagesDir, dir, target);
  }

  return {
    '^@elbwalker/jest$1': getDirectory('config/jest$1', ''),
    '^@elbwalker/types': getDirectory('types', 'src'),
    '^@elbwalker/utils$1': getDirectory('utils$1'),
    '^@elbwalker/walker.js': getDirectory('sources/walkerjs'),
    '^@elbwalker/destination-web-(.*)$': getDirectory('destinations/web/$1'),
    '^@elbwalker/destination-node-(.*)$': getDirectory('destinations/node/$1'),
    '^@elbwalker/source-(.*)$': getDirectory('sources/$1'),
  };
}

const config = {
  transform: {
    '^.+\\.(t|j)sx?$': [
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
  transformIgnorePatterns: ['/node_modules/(?!(@elbwalker)/)'],
  testMatch: ['<rootDir>/**/*.test.(ts|tsx|js|jsx)'],
  moduleFileExtensions: ['js', 'ts', 'mjs'],
  rootDir: 'src',
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: getModuleMapper(),
};

export default config;
