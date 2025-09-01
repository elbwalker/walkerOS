import type { Flow } from '@walkeros/core';
import { valid, satisfies, coerce } from 'semver';
import { ResolveError } from '../types';
import type { CacheOptions } from './cache';
import {
  getCacheDir,
  getBuildDir,
  isCached,
  getCachedCode,
  cachePackageCode,
  cleanupCache,
} from './cache';
import { promisify } from 'util';
import { exec } from 'child_process';
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
  copyFileSync,
} from 'fs';
import { join, sep } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export interface ResolvedPackage {
  package: Flow.Package;
  code: string;
}

interface PackageMetadata {
  name: string;
  version: string;
  dist: {
    tarball: string;
    shasum: string;
  };
  main?: string;
  module?: string;
  exports?: Record<string, unknown>;
}

/**
 * Resolve packages from Flow configuration
 */
export async function resolvePackages(
  packages: Flow.Package[],
  cacheOptions?: CacheOptions,
): Promise<ResolvedPackage[]> {
  try {
    const resolved: ResolvedPackage[] = [];

    // Set up cache directory if provided
    let cacheDir: string | undefined;
    let buildDir: string | undefined;

    if (cacheOptions?.cacheDir) {
      cacheDir = getCacheDir(cacheOptions.cacheDir);
      // Clean up old cache entries periodically
      cleanupCache(cacheDir);
    }

    if (cacheOptions?.buildDir) {
      buildDir = getBuildDir(cacheOptions.buildDir);
    }

    // Sort packages by type for proper loading order
    const sortedPackages = sortPackagesByType(packages);

    for (const pkg of sortedPackages) {
      const code = await resolvePackageCode(
        pkg,
        cacheDir,
        buildDir,
        cacheOptions?.noCleanup,
      );
      resolved.push({
        package: pkg,
        code,
      });
    }

    return resolved;
  } catch (error) {
    if (error instanceof ResolveError) {
      throw error;
    }
    throw new ResolveError('Failed to resolve packages', { error });
  }
}

/**
 * Sort packages by initialization order (core -> collector -> sources -> destinations)
 */
function sortPackagesByType(packages: Flow.Package[]): Flow.Package[] {
  const typeOrder: Record<Flow.PackageType, number> = {
    core: 0,
    collector: 1,
    source: 2,
    destination: 3,
  };

  return [...packages].sort((a, b) => {
    const orderA = typeOrder[a.type];
    const orderB = typeOrder[b.type];

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Within same type, sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Resolve package code from package specification
 */
async function resolvePackageCode(
  pkg: Flow.Package,
  cacheDir?: string,
  buildDir?: string,
  noCleanup?: boolean,
): Promise<string> {
  validateVersion(pkg.version);

  // Check cache first
  if (cacheDir && isCached(pkg, cacheDir)) {
    console.log(`Using cached package: ${pkg.name}@${pkg.version}`);
    return getCachedCode(pkg, cacheDir);
  }

  try {
    // 1. Query npm registry API for package metadata
    const metadata = await fetchPackageMetadata(pkg.name, pkg.version);

    // 2. Create temporary directory and install package
    const tempDir =
      buildDir || mkdtempSync(join(tmpdir(), 'walkeros-generator-'));
    let packageCode: string;

    try {
      packageCode = await installAndExtractPackage(metadata, tempDir, buildDir);

      // Cache the resolved package code
      if (cacheDir) {
        cachePackageCode(pkg, packageCode, cacheDir, metadata);
      }
    } finally {
      // 3. Cleanup temporary directory (unless requested to keep or using build dir)
      if (!noCleanup && !buildDir) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }

    return packageCode;
  } catch (error) {
    console.warn(
      `Failed to resolve real package ${pkg.name}@${pkg.version}, falling back to mock:`,
      error,
    );
    // Fallback to mock implementation
    return getMockPackageCode(pkg.name, pkg.type);
  }
}

/**
 * Fetch package metadata from npm registry
 */
async function fetchPackageMetadata(
  name: string,
  version: string,
): Promise<PackageMetadata> {
  try {
    // Use npm view command to get package metadata
    const versionSpec = version === 'latest' ? '' : `@${version}`;
    const command = `npm view ${name}${versionSpec} --json`;

    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout);

    // Handle both single version and array of versions
    const packageData = Array.isArray(data) ? data[0] : data;

    return {
      name: packageData.name,
      version: packageData.version,
      dist: packageData.dist,
      main: packageData.main,
      module: packageData.module,
      exports: packageData.exports,
    };
  } catch (error) {
    throw new ResolveError(`Failed to fetch metadata for ${name}@${version}`, {
      error,
    });
  }
}

/**
 * Install package to temporary directory and extract code
 */
async function installAndExtractPackage(
  metadata: PackageMetadata,
  tempDir: string,
  buildDir?: string,
): Promise<string> {
  try {
    // Install package in temporary directory
    const installCommand = `npm install ${metadata.name}@${metadata.version}`;
    await execAsync(installCommand, { cwd: tempDir });

    // Extract package code
    const packagePath = join(tempDir, 'node_modules', metadata.name);
    const extractedCode = extractPackageCode(packagePath, metadata);

    // If using build directory, save the extracted code for inspection
    if (buildDir) {
      const extractedPath = join(
        buildDir,
        'extracted',
        `${metadata.name.replace(/[\/\\:]/g, '_')}.js`,
      );
      require('fs').mkdirSync(join(buildDir, 'extracted'), { recursive: true });
      require('fs').writeFileSync(extractedPath, extractedCode);
    }

    // Transform ES modules to IIFE-compatible format
    return transformESModuleToCommonJS(extractedCode);
  } catch (error) {
    throw new ResolveError(
      `Failed to install/extract ${metadata.name}@${metadata.version}`,
      { error },
    );
  }
}

/**
 * Extract package code from installed package
 */
function extractPackageCode(
  packagePath: string,
  metadata: PackageMetadata,
): string {
  // Try different entry points in order of preference
  const entryPoints = [
    // 1. Check dist/index.js (CJS)
    join(packagePath, 'dist', 'index.js'),
    // 2. Check main field from package.json
    metadata.main ? join(packagePath, metadata.main) : null,
    // 3. Check module field (ESM)
    metadata.module ? join(packagePath, metadata.module) : null,
    // 4. Default index.js
    join(packagePath, 'index.js'),
    // 5. Check dist directory for any JS files
    join(packagePath, 'dist', 'index.mjs'),
  ].filter(Boolean) as string[];

  for (const entryPoint of entryPoints) {
    if (existsSync(entryPoint)) {
      try {
        return readFileSync(entryPoint, 'utf-8');
      } catch (error) {
        console.warn(`Failed to read ${entryPoint}:`, error);
        continue;
      }
    }
  }

  throw new ResolveError(`No valid entry point found for ${metadata.name}`, {
    packagePath,
    triedPaths: entryPoints,
  });
}

/**
 * Validate version format
 */
function validateVersion(version: string): void {
  if (version === 'latest' || version === 'mock') {
    return; // Allow these special versions
  }

  if (
    !valid(version) &&
    !version.includes('*') &&
    !version.includes('^') &&
    !version.includes('~')
  ) {
    throw new ResolveError(`Invalid version format: ${version}`);
  }
}

/**
 * Transform ES module syntax to CommonJS/IIFE compatible format
 */
function transformESModuleToCommonJS(code: string): string {
  return code
    .replace(/export const (\w+) = /g, 'const $1 = ')
    .replace(/export function (\w+)/g, 'function $1')
    .replace(/export \{[^}]+\}/g, '') // Remove export statements
    .replace(/import .*/g, '') // Remove import statements
    .trim();
}

/**
 * Mock package code generator
 * Used as fallback when real package resolution fails
 */
function getMockPackageCode(
  packageName: string,
  packageType: Flow.PackageType,
): string {
  // Fallback mock implementations when real packages can't be resolved

  const mockCode: Record<string, string> = {
    '@walkeros/core': `
// FALLBACK: Mock @walkeros/core package code (real resolution failed)
const createSource = (source, config) => ({ source, config });
const assign = Object.assign;
const isString = (value) => typeof value === 'string';
const isObject = (value) => value && typeof value === 'object';
`,
    '@walkeros/collector': `
// FALLBACK: Mock @walkeros/collector package code (real resolution failed)
const createCollector = async (config) => {
  const collector = { sources: {}, destinations: {} };
  const elb = (event, data) => console.log('Event:', event, data);
  return { collector, elb };
};
`,
    '@walkeros/web-source-browser': `
// FALLBACK: Mock @walkeros/web-source-browser package code (real resolution failed)
const sourceBrowser = {
  init: (config) => ({ elb: (event, data) => console.log('Browser:', event, data) })
};
`,
    '@walkeros/web-destination-gtag': `
// FALLBACK: Mock @walkeros/web-destination-gtag package code (real resolution failed)
const destinationGtag = {
  push: (event, context) => {
    if (typeof gtag !== 'undefined') {
      gtag('event', event.event, event.data);
    }
  }
};
`,
    '@walkeros/web-destination-meta': `
// FALLBACK: Mock @walkeros/web-destination-meta package code (real resolution failed)
const destinationMeta = {
  push: (event, context) => {
    if (typeof fbq !== 'undefined') {
      fbq('track', event.event, event.data);
    }
  }
};
`,
    '@walkeros/web-destination-api': `
// FALLBACK: Mock @walkeros/web-destination-api package code (real resolution failed)
const destinationApi = {
  push: async (event, context) => {
    const config = context.config || {};
    if (config.endpoint) {
      console.log('API call:', config.endpoint, event);
    }
  }
};
`,
  };

  const code = mockCode[packageName];
  if (code) {
    return code;
  }

  // Generic fallback for unknown packages
  return `
// FALLBACK: Generic mock for ${packageType} package: ${packageName} (real resolution failed)
const mock${packageType.charAt(0).toUpperCase() + packageType.slice(1)} = {
  init: () => console.log('Mock ${packageType}: ${packageName}')
};
`;
}
