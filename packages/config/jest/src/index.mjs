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
    '^@walkeros/core$': getDirectory('core/src/'),
    '^@walkeros/collector$': getDirectory('collector/src/'),
    '^@walkeros/web-core$': getDirectory('web/core/src/'),
    '^@walkeros/web-destination-gtag$': getDirectory(
      'web/destinations/gtag/src/',
    ),
    '^@walkeros/web-destination-api$': getDirectory(
      'web/destinations/api/src/',
    ),
    '^@walkeros/web-destination-meta$': getDirectory(
      'web/destinations/meta/src/',
    ),
    '^@walkeros/web-destination-piwikpro$': getDirectory(
      'web/destinations/piwikpro/src/',
    ),
    '^@walkeros/web-destination-plausible$': getDirectory(
      'web/destinations/plausible/src/',
    ),
    '^@walkeros/web-source-browser$': getDirectory('web/sources/browser/src/'),
    '^@walkeros/web-source-datalayer$': getDirectory(
      'web/sources/dataLayer/src/',
    ),
    '^@walkeros/server-core$': getDirectory('server/core/src/'),
    '^@walkeros/server-destination-aws$': getDirectory(
      'server/destinations/aws/src/',
    ),
    '^@walkeros/server-destination-gcp$': getDirectory(
      'server/destinations/gcp/src/',
    ),
    '^@walkeros/server-destination-meta$': getDirectory(
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
