import path from 'path';
import { fileURLToPath } from 'url';

const isWatchMode = process.argv.includes('--watchAll');
const packagesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '/',
);

function getDirectory(dir) {
  return path.join(packagesDir, dir);
}

function getModuleMapper() {
  if (!isWatchMode) return {};

  return {
    '^@elbwalker/utils$': getDirectory('utils/src/'),
    '^@elbwalker/utils/node$': getDirectory('utils/src/node/'),
    '^@elbwalker/utils/web$': getDirectory('utils/src/web/'),
    '^@elbwalker/walker.js$': getDirectory('sources/walkerjs'),
    '^@elbwalker/source-node$': getDirectory('sources/node'),
    '^@elbwalker/destination-web-(.*)$': getDirectory('destinations/web/$1'),
    '^@elbwalker/destination-node-(.*)$': getDirectory('destinations/node/$1'),
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
  rootDir: '.',
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: getModuleMapper(),
};

export default config;
