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
  cleanBuildDir,
  isPackageInstalled,
  isPackageExtracted,
  getExtractedCode,
  getCacheKey,
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

    // Set up cache directory if provided (unless noCache is true)
    let cacheDir: string | undefined;
    let buildDir: string | undefined;

    if (cacheOptions?.cacheDir && !cacheOptions.noCache) {
      cacheDir = getCacheDir(cacheOptions.cacheDir);
      // Clean up old cache entries periodically
      cleanupCache(cacheDir);
    }

    if (cacheOptions?.buildDir) {
      buildDir = getBuildDir(cacheOptions.buildDir);

      // Clean build directory if requested
      if (cacheOptions.clean) {
        console.log('🧹 Cleaning build directory...');
        cleanBuildDir(buildDir);
        // Recreate the directory
        buildDir = getBuildDir(cacheOptions.buildDir);
      }
    }

    // Sort packages by type for proper loading order
    const sortedPackages = sortPackagesByType(packages);

    for (const pkg of sortedPackages) {
      const code = await resolvePackageCode(
        pkg,
        cacheDir,
        buildDir,
        cacheOptions,
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
  options?: CacheOptions,
): Promise<string> {
  validateVersion(pkg.version);

  // Priority 1: Check package cache first (unless noCache is true)
  if (cacheDir && !options?.noCache && isCached(pkg, cacheDir)) {
    console.log(`📦 Using cached package: ${pkg.name}@${pkg.version}`);
    return getCachedCode(pkg, cacheDir);
  }

  // Priority 2: Check build directory for extracted package
  if (buildDir && isPackageExtracted(pkg, buildDir)) {
    console.log(`🔧 Using extracted package: ${pkg.name}@${pkg.version}`);
    const extractedCode = getExtractedCode(pkg, buildDir);

    // Also cache it if caching is enabled
    if (cacheDir && !options?.noCache) {
      const metadata = await fetchPackageMetadata(pkg.name, pkg.version);
      cachePackageCode(
        pkg,
        extractedCode,
        cacheDir,
        metadata as unknown as Record<string, unknown>,
      );
    }

    return extractedCode;
  }

  try {
    // Fetch package metadata
    const metadata = await fetchPackageMetadata(pkg.name, pkg.version);

    let packageCode: string;
    let workingDir: string;

    if (buildDir) {
      // Use persistent build directory
      workingDir = buildDir;

      // Check if package is already installed in build directory
      if (isPackageInstalled(pkg, buildDir)) {
        console.log(
          `♻️  Reusing installed package: ${pkg.name}@${pkg.version}`,
        );
        // Package is already installed, just extract it
        const packagePath = join(buildDir, 'node_modules', pkg.name);
        const extractedCode = extractPackageCode(packagePath, metadata);
        packageCode = transformESModuleToCommonJS(extractedCode);

        // Save extracted code for future use
        const key = getCacheKey(pkg);
        const extractedPath = join(buildDir, 'extracted', `${key}.js`);
        require('fs').mkdirSync(join(buildDir, 'extracted'), {
          recursive: true,
        });
        require('fs').writeFileSync(extractedPath, packageCode);
      } else {
        console.log(`⬇️  Installing package: ${pkg.name}@${pkg.version}`);
        packageCode = await installAndExtractPackage(
          metadata,
          workingDir,
          buildDir,
        );
      }
    } else {
      // Use temporary directory (old behavior)
      workingDir = mkdtempSync(join(tmpdir(), 'walkeros-generator-'));

      try {
        packageCode = await installAndExtractPackage(metadata, workingDir);
      } finally {
        // Clean up temp directory
        rmSync(workingDir, { recursive: true, force: true });
      }
    }

    // Cache the resolved package code (unless noCache is true)
    if (cacheDir && !options?.noCache) {
      cachePackageCode(
        pkg,
        packageCode,
        cacheDir,
        metadata as unknown as Record<string, unknown>,
      );
    }

    return packageCode;
  } catch (error) {
    // Create a comprehensive error message with troubleshooting info
    let errorMessage = `Failed to resolve package ${pkg.name}@${pkg.version}`;
    let suggestions: string[] = [];

    if (error instanceof ResolveError) {
      errorMessage += `: ${error.message}`;

      // Add specific suggestions based on the error details
      if (error.message.includes('Failed to fetch metadata')) {
        suggestions.push('• Check if the package name and version are correct');
        suggestions.push('• Verify network connectivity to npm registry');
        suggestions.push('• Try running: npm view ${pkg.name}@${pkg.version}');
      } else if (error.message.includes('Failed to install/extract')) {
        suggestions.push('• Ensure npm is properly installed and configured');
        suggestions.push(
          '• Check if the package version exists on npm registry',
        );
        suggestions.push('• Try clearing npm cache: npm cache clean --force');
      } else if (error.message.includes('No valid entry point found')) {
        suggestions.push(
          '• The package may not be compatible with this generator',
        );
        suggestions.push(
          '• Check if the package has a valid main/module entry point',
        );
      }
    } else {
      errorMessage += `: ${error}`;
      suggestions.push('• Check package name and version are correct');
      suggestions.push('• Ensure network connectivity');
      suggestions.push('• Verify npm is properly configured');
    }

    // Add general troubleshooting suggestions
    suggestions.push('• Run with --verbose flag for more details');
    if (buildDir) {
      suggestions.push('• Try with --clean flag to force fresh download');
    }

    const fullMessage =
      suggestions.length > 0
        ? `${errorMessage}\n\nTroubleshooting suggestions:\n${suggestions.join('\n')}`
        : errorMessage;

    throw new ResolveError(fullMessage, {
      originalError: error,
      packageName: pkg.name,
      packageVersion: pkg.version,
      packageType: pkg.type,
    });
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
    // Create minimal package.json in temp directory for npm install to work
    const packageJsonPath = join(tempDir, 'package.json');
    const minimalPackageJson = {
      name: 'walkeros-temp-install',
      version: '1.0.0',
      private: true,
    };
    require('fs').writeFileSync(
      packageJsonPath,
      JSON.stringify(minimalPackageJson, null, 2),
    );

    // Install package in temporary directory
    const installCommand = `npm install ${metadata.name}@${metadata.version}`;
    console.log(`📦 Installing ${metadata.name}@${metadata.version}...`);

    try {
      // Add debug logging for promise resolution tracking
      const startTime = Date.now();
      const execPromise = execAsync(installCommand, {
        cwd: tempDir,
        timeout: process.env.NODE_ENV === 'test' ? 5000 : 60000, // 5s for tests, 60s for production
      });

      const { stdout, stderr } = await execPromise;
      const endTime = Date.now();
      console.log(`⏱️  Command completed in ${endTime - startTime}ms`);

      if (stderr && !stderr.includes('npm WARN')) {
        console.warn(`npm install warnings for ${metadata.name}:`, stderr);
      }

      if (stdout) {
        console.log(
          `✅ Successfully installed ${metadata.name}@${metadata.version}`,
        );
      }
    } catch (installError: unknown) {
      const errorMessage =
        installError instanceof Error
          ? installError.message
          : String(installError);
      console.error(
        `❌ npm install failed for ${metadata.name}@${metadata.version}:`,
        errorMessage,
      );

      // Re-throw with more specific error information
      throw new Error(`npm install failed: ${errorMessage}`);
    }

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
