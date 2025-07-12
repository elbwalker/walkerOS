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
    '^@walkerOS/server-collector$': getDirectory('server/collector/src/'),
    '^@walkerOS/web-collector$': getDirectory('web/collector/src/'),
    '^@walkerOS/web-destination-ga4$': getDirectory(
      'web/destinations/ga4/src/',
    ),
    '^@walkerOS/web-destination-gtm$': getDirectory(
      'web/destinations/gtm/src/',
    ),
    '^@walkerOS/web-destination-google_ads$': getDirectory(
      'web/destinations/google_ads/src/',
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
    '^@walkerOS/web-source-dataLayer$': getDirectory(
      'web/sources/dataLayer/src/',
    ),
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
  moduleFileExtensions: ['js', 'ts', 'mjs'],
  rootDir: '.',
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: getModuleMapper(),
};

export default config;
