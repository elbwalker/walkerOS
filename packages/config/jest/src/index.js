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
    '^@walkerOS/utils$': getDirectory('utils/src/'),
    '^@walkerOS/node$': getDirectory('node/walkerjs/src/'),
    '^@walkerOS/web$': getDirectory('web/walkerjs/src/'),
    '^@walkerOS/web-google$': getDirectory('web/google/src/'),
    '^@walkerOS/web-meta$': getDirectory('web/meta/src/'),
    '^@walkerOS/web-piwikpro$': getDirectory('web/piwikpro/src/'),
    '^@walkerOS/web-plausible$': getDirectory('web/plausible/src/'),
    '^@walkerOS/node-aws$': getDirectory('node/aws/src/'),
    '^@walkerOS/node-google$': getDirectory('node/google/bigquery/src/'),
    '^@walkerOS/node-meta$': getDirectory('node/meta/src/'),
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
  transformIgnorePatterns: ['/node_modules/(?!(@walkerOS)/)'],
  testMatch: ['<rootDir>/**/*.test.(ts|tsx|js|jsx)'],
  moduleFileExtensions: ['js', 'ts', 'mjs'],
  rootDir: '.',
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: getModuleMapper(),
};

export default config;
