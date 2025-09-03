import type { Flow } from '@walkeros/core';
import { BundleError } from '../types';
import type { ResolvedPackage } from './resolver';

/**
 * Generate IIFE bundle from flow configuration and resolved packages
 */
export async function generateBundle(
  config: Flow.Config,
  resolvedPackages: ResolvedPackage[],
): Promise<string> {
  try {
    // Transform package code for IIFE compatibility
    const packageCode = transformPackageCode(resolvedPackages);

    // Generate initialization code from flow configuration
    const initCode = generateInitCode(config);

    // Combine into IIFE bundle
    const bundle = createIIFEBundle(packageCode, initCode);

    return bundle;
  } catch (error) {
    throw new BundleError('Failed to generate bundle', { error });
  }
}

/**
 * Transform package code to IIFE-compatible format
 * Extracts clean package objects without CommonJS wrappers
 */
function transformPackageCode(resolvedPackages: ResolvedPackage[]): string {
  const packageSections: string[] = [];

  packageSections.push('// 1. PACKAGES CODE');
  packageSections.push('// Clean extracted package objects');

  // Get all packages for the dynamic require function
  const allPackages = resolvedPackages.map((r) => r.package);

  for (const resolved of resolvedPackages) {
    packageSections.push(
      `// ${resolved.package.name}@${resolved.package.version} (${resolved.package.type})`,
    );

    // Extract clean package objects from the minified code
    const cleanCode = extractPackageObjects(
      resolved.code,
      resolved.package,
      allPackages,
    );
    packageSections.push(cleanCode);
  }

  return packageSections.join('\n');
}

/**
 * Build dynamic require function from package list
 */
function buildRequireFunction(allPackages: Flow.Package[]): string {
  const requireCases = allPackages
    .map(
      (pkg) =>
        `    if (packageName === '${pkg.name}') {
      return ${pkg.id} || {};
    }`,
    )
    .join('\n');

  return `
  // Mock require function for cross-package dependencies
  var require = function(packageName) {
${requireCases}
    // Return empty object for unknown dependencies
    return {};
  };`;
}

/**
 * Extract real package exports from minified CommonJS code
 * Transforms the CommonJS module into browser-compatible variables
 */
function extractPackageObjects(
  code: string,
  pkg: Flow.Package,
  allPackages: Flow.Package[],
): string {
  const packageVariable = pkg.id;
  const requireFunction = buildRequireFunction(allPackages);

  // Transform the CommonJS module into an IIFE that exposes the exports
  // This avoids the "module is not defined" error in the browser
  const extractedCode = `
// ${pkg.name}@${pkg.version} (${pkg.type}) - REAL PACKAGE CODE
var ${packageVariable} = (function() {
  // Create CommonJS environment
  var module = { exports: {} };
  var exports = module.exports;
  ${requireFunction}
  
  // Execute the original package code
  ${code}
  
  // Return the exports
  return module.exports;
})();`;

  return extractedCode;
}

/**
 * Build package lookup map
 */
function buildPackageLookup(config: Flow.Config): Map<string, string> {
  const packageLookup = new Map<string, string>();
  config.packages.forEach((pkg) => {
    packageLookup.set(pkg.name, pkg.id);
  });
  return packageLookup;
}

/**
 * Generate source configurations at build time
 */
function generateSourceConfigs(
  config: Flow.Config,
  packageLookup: Map<string, string>,
): string {
  const sourceNodes = config.nodes.filter((node) => node.type === 'source');

  if (sourceNodes.length === 0) return '';

  // Get core package ID for createSource function
  const corePackageId = packageLookup.get('@walkeros/core');
  if (!corePackageId) {
    throw new Error(
      'Core package not found - required for createSource function',
    );
  }

  const sourceConfigs = sourceNodes
    .map((node) => {
      const pkgId = packageLookup.get(node.package);
      if (!pkgId) {
        throw new Error(
          `Package not found for source node ${node.id}: ${node.package}`,
        );
      }

      return `    "${node.id}": ${corePackageId}.createSource(${pkgId}.sourceBrowser || ${pkgId}.default, ${JSON.stringify(node.config)})`;
    })
    .join(',\n');

  return `  collectorConfig.sources = {\n${sourceConfigs}\n  };`;
}

/**
 * Generate destination configurations at build time
 */
function generateDestinationConfigs(
  config: Flow.Config,
  packageLookup: Map<string, string>,
): string {
  const destNodes = config.nodes.filter((node) => node.type === 'destination');

  if (destNodes.length === 0) return '';

  const destConfigs = destNodes
    .map((node) => {
      const pkgId = packageLookup.get(node.package);
      if (!pkgId) {
        throw new Error(
          `Package not found for destination node ${node.id}: ${node.package}`,
        );
      }

      return `    "${node.id}": {...(${pkgId}.destinationGtag || ${pkgId}.default), config: ${JSON.stringify(node.config)}}`;
    })
    .join(',\n');

  return `  collectorConfig.destinations = {\n${destConfigs}\n  };`;
}

/**
 * Generate walkerOS initialization code using static code generation
 * Pre-computes all configurations at build time for optimal runtime performance
 */
function generateInitCode(config: Flow.Config): string {
  const packageLookup = buildPackageLookup(config);

  // Pre-compute collector configuration
  const collectorNode = config.nodes.find((node) => node.type === 'collector');
  const baseCollectorConfig = collectorNode
    ? JSON.stringify(collectorNode.config)
    : '{}';

  // Pre-compute source and destination configurations
  const sourceConfigs = generateSourceConfigs(config, packageLookup);
  const destConfigs = generateDestinationConfigs(config, packageLookup);

  // Get collector package ID
  const collectorPkgId = packageLookup.get('@walkeros/collector');
  if (!collectorPkgId) {
    throw new Error('Collector package not found in Flow configuration');
  }

  // Generate minimal, static runtime code
  return `
async function initializeWalkerOS() {
  const collectorConfig = Object.assign({}, ${baseCollectorConfig});
${sourceConfigs ? sourceConfigs : ''}
${destConfigs ? destConfigs : ''}
  const {collector, elb} = await ${collectorPkgId}.createCollector(collectorConfig);
  return collector;
}

function initializeWhenReady() {
  initializeWalkerOS().then(collector => {
    window.walkerOS = collector;
  }).catch(error => {
    console.error("WalkerOS initialization failed:", error);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeWhenReady);
} else {
  initializeWhenReady();
}`.trim();
}

/**
 * Create IIFE bundle wrapper for 4-part structure
 */
function createIIFEBundle(packageCode: string, initCode: string): string {
  return `/*!
 * WalkerOS Bundle
 * Generated from Flow configuration
 */
(function(window) {
  'use strict';
  
  ${packageCode}
  
  ${initCode}
  
})(typeof window !== 'undefined' ? window : {});`;
}
