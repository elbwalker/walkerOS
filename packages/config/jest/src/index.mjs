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
    '^@walkerOS/core$': getDirectory('core/src/'),
    '^@walkerOS/collector$': getDirectory('collector/src/'),
    '^@walkerOS/web-core$': getDirectory('web/core/src/'),
    '^@walkerOS/web-destination-gtag$': getDirectory(
      'web/destinations/gtag/src/',
    ),
    '^@walkerOS/web-destination-api$': getDirectory(
      'web/destinations/api/src/',
    ),
    '^@walkerOS/web-destination-meta$': getDirectory(
      'web/destinations/meta/src/',
    ),
    '^@walkerOS/web-destination-piwikpro$': getDirectory(
      'web/destinations/piwikpro/src/',
    ),
    '^@walkerOS/web-destination-plausible$': getDirectory(
      'web/destinations/plausible/src/',
    ),
    '^@walkerOS/web-source-browser$': getDirectory('web/sources/browser/src/'),
    '^@walkerOS/web-source-dataLayer$': getDirectory(
      'web/sources/dataLayer/src/',
    ),
    '^@walkerOS/server-core$': getDirectory('server/core/src/'),
    '^@walkerOS/server-destination-aws$': getDirectory(
      'server/destinations/aws/src/',
    ),
    '^@walkerOS/server-destination-gcp$': getDirectory(
      'server/destinations/gcp/src/',
    ),
    '^@walkerOS/server-destination-meta$': getDirectory(
      'server/destinations/meta/src/',
    ),
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
  moduleFileExtensions: ['js', 'ts', 'tsx', 'mjs'],
  rootDir: '.',
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: getModuleMapper(),
};

export default config;
