import { BundleError } from '../types';
import type {
  GeneratorConfig,
  GeneratorSourceInit,
  GeneratorDestinationInit,
} from '../types';
import type { ResolvedPackage } from './resolver';

/**
 * Generate IIFE bundle from flow configuration and resolved packages
 */
export async function generateBundle(
  config: GeneratorConfig,
  resolvedPackages: ResolvedPackage[],
): Promise<string> {
  try {
    // Transform package code for IIFE compatibility
    const packageCode = transformPackageCode(resolvedPackages);

    // Generate initialization code from collector configuration
    const initCode = generateInitCode(config, resolvedPackages);

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
  const allPackages = resolvedPackages;

  for (const resolved of resolvedPackages) {
    packageSections.push(
      `// ${resolved.package.name}@${resolved.package.version}`,
    );

    // Extract clean package objects from the minified code
    const cleanCode = extractPackageObjects(
      resolved.code,
      resolved,
      allPackages,
    );
    packageSections.push(cleanCode);
  }

  return packageSections.join('\n');
}

/**
 * Build dynamic require function from resolved packages
 */
function buildRequireFunction(allPackages: ResolvedPackage[]): string {
  const requireCases = allPackages
    .map((resolved) => {
      const varName = sanitizeVariableName(resolved.package.name);
      return `    if (packageName === '${resolved.package.name}') {
      return ${varName} || {};
    }`;
    })
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
  resolved: ResolvedPackage,
  allPackages: ResolvedPackage[],
): string {
  const packageVariable = sanitizeVariableName(resolved.package.name);
  const requireFunction = buildRequireFunction(allPackages);

  // Transform the CommonJS module into an IIFE that exposes the exports
  // This avoids the "module is not defined" error in the browser
  const extractedCode = `
// ${resolved.package.name}@${resolved.package.version} - REAL PACKAGE CODE
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
 * Build package lookup map from resolved packages
 */
function buildPackageLookup(
  resolvedPackages: ResolvedPackage[],
): Map<string, string> {
  const packageLookup = new Map<string, string>();
  resolvedPackages.forEach((resolved) => {
    // Use package name as variable name (sanitized)
    const varName = sanitizeVariableName(resolved.package.name);
    packageLookup.set(resolved.package.name, varName);
  });
  return packageLookup;
}

/**
 * Sanitize package name to valid JavaScript variable name
 */
function sanitizeVariableName(name: string): string {
  // Replace invalid characters with underscores and ensure it starts with letter/underscore
  return name.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[^a-zA-Z_$]/, '_$&');
}

/**
 * Generate source configurations at build time
 */
function generateSourceConfigs(
  config: GeneratorConfig,
  packageLookup: Map<string, string>,
): string {
  if (!config.sources) return '';

  const sourceConfigs = Object.entries(config.sources)
    .map(([id, source]) => {
      const sourceObj = source as GeneratorSourceInit;

      // For now, assume the code refers to a package by name
      // In a real implementation, we'd need to resolve the actual source instance
      // to its package name. For this simplified version, we'll extract from
      // common source package names
      let pkgId: string | undefined;

      // Try to find matching package by common naming patterns
      for (const [name, varName] of packageLookup) {
        if (
          name.includes('source') ||
          name.includes('browser') ||
          name.includes('datalayer')
        ) {
          pkgId = varName;
          break;
        }
      }

      if (!pkgId) {
        throw new Error(`Could not resolve source package for ${id}`);
      }

      let sourceConfig = `    "${id}": { code: ${pkgId}`;

      if (sourceObj.config) {
        sourceConfig += `, config: ${JSON.stringify(sourceObj.config)}`;
      }

      if (sourceObj.env) {
        sourceConfig += `, env: ${JSON.stringify(sourceObj.env)}`;
      }

      sourceConfig += ' }';
      return sourceConfig;
    })
    .join(',\n');

  return `  collectorConfig.sources = {\n${sourceConfigs}\n  };`;
}

/**
 * Generate destination configurations at build time
 */
function generateDestinationConfigs(
  config: GeneratorConfig,
  packageLookup: Map<string, string>,
): string {
  if (!config.destinations) return '';

  const destConfigs = Object.entries(config.destinations)
    .map(([id, destination]) => {
      const destObj = destination as GeneratorDestinationInit;

      // For now, assume the code refers to a package by name
      // In a real implementation, we'd need to resolve the actual destination instance
      // to its package name. For this simplified version, we'll extract from
      // common destination package names
      let pkgId: string | undefined;

      // Try to find matching package by common naming patterns
      for (const [name, varName] of packageLookup) {
        if (
          name.includes('destination') ||
          name.includes('gtag') ||
          name.includes('api')
        ) {
          pkgId = varName;
          break;
        }
      }

      if (!pkgId) {
        throw new Error(`Could not resolve destination package for ${id}`);
      }

      let destConfig = `    "${id}": { code: ${pkgId}`;

      if (destObj.config) {
        destConfig += `, config: ${JSON.stringify(destObj.config)}`;
      }

      if (destObj.env) {
        destConfig += `, env: ${JSON.stringify(destObj.env)}`;
      }

      destConfig += ' }';
      return destConfig;
    })
    .join(',\n');

  return `  collectorConfig.destinations = {\n${destConfigs}\n  };`;
}

/**
 * Find package variable name from code reference
 */
function findPackageVariable(
  codeRef: string,
  packageLookup: Map<string, string>,
): string | undefined {
  // codeRef could be the package name or a variable reference
  // First try direct lookup
  if (packageLookup.has(codeRef)) {
    return packageLookup.get(codeRef);
  }

  // If it's already a variable reference, return as-is
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(codeRef)) {
    return codeRef;
  }

  return undefined;
}

/**
 * Generate walkerOS initialization code using static code generation
 * Pre-computes all configurations at build time for optimal runtime performance
 */
function generateInitCode(
  config: GeneratorConfig,
  resolvedPackages: ResolvedPackage[],
): string {
  const packageLookup = buildPackageLookup(resolvedPackages);

  // Pre-compute base collector configuration
  const baseConfig = {
    run: config.run ?? true,
    consent: config.consent,
    user: config.user,
    globals: config.globals,
    custom: config.custom,
    verbose: config.verbose ?? false,
  };

  // Remove undefined values
  const cleanBaseConfig = Object.fromEntries(
    Object.entries(baseConfig).filter(([, value]) => value !== undefined),
  );

  const baseCollectorConfig =
    Object.keys(cleanBaseConfig).length > 0
      ? JSON.stringify(cleanBaseConfig)
      : '{}';

  // Pre-compute source and destination configurations
  const sourceConfigs = generateSourceConfigs(config, packageLookup);
  const destConfigs = generateDestinationConfigs(config, packageLookup);

  // Get collector package ID
  const collectorPkgId = packageLookup.get('@walkeros/collector');
  if (!collectorPkgId) {
    throw new Error('Collector package not found in resolved packages');
  }

  // Generate minimal, static runtime code
  return `
async function initializeWalkerOS() {
  const collectorConfig = Object.assign({}, ${baseCollectorConfig});
${sourceConfigs ? sourceConfigs : ''}
${destConfigs ? destConfigs : ''}
  const {collector, elb} = await ${collectorPkgId}.createCollector(collectorConfig);
  return {collector, elb};
}

function initializeWhenReady() {
  initializeWalkerOS().then(({collector, elb}) => {
    window.walkerOS = collector;
    window.elb = elb;
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
