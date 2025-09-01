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

  for (const resolved of resolvedPackages) {
    packageSections.push(
      `// ${resolved.package.name}@${resolved.package.version} (${resolved.package.type})`,
    );

    // Extract clean package objects from the minified code
    const cleanCode = extractPackageObjects(resolved.code, resolved.package);
    packageSections.push(cleanCode);
  }

  return packageSections.join('\n');
}

/**
 * Extract real package exports from minified CommonJS code
 * Transforms the CommonJS module into browser-compatible variables
 */
function extractPackageObjects(code: string, pkg: Flow.Package): string {
  const packageVariable = getPackageVariableName(pkg.name);

  if (!packageVariable) {
    return '// Package not supported yet';
  }

  // Transform the CommonJS module into an IIFE that exposes the exports
  // This avoids the "module is not defined" error in the browser
  const extractedCode = `
// ${pkg.name}@${pkg.version} (${pkg.type}) - REAL PACKAGE CODE
var ${packageVariable} = (function() {
  // Create CommonJS environment
  var module = { exports: {} };
  var exports = module.exports;
  
  // Mock require function for cross-package dependencies
  var require = function(packageName) {
    if (packageName === '@walkeros/core') {
      return walkerOSCore || {};
    }
    if (packageName === '@walkeros/collector') {
      return walkerOSCollector || {};
    }
    if (packageName === '@walkeros/web-source-browser') {
      return walkerOSSourceBrowser || {};
    }
    if (packageName === '@walkeros/web-destination-gtag') {
      return walkerOSDestinationGtag || {};
    }
    if (packageName === '@walkeros/web-core') {
      return walkerOSWebCore || {};
    }
    // Return empty object for unknown dependencies
    return {};
  };
  
  // Execute the original package code
  ${code}
  
  // Return the exports
  return module.exports;
})();`;

  return extractedCode;
}

/**
 * Get expected package variable name from package name
 */
function getPackageVariableName(packageName: string): string | null {
  const packageMap: Record<string, string> = {
    '@walkeros/core': 'walkerOSCore',
    '@walkeros/collector': 'walkerOSCollector',
    '@walkeros/web-core': 'walkerOSWebCore',
    '@walkeros/web-source-browser': 'walkerOSSourceBrowser',
    '@walkeros/web-destination-gtag': 'walkerOSDestinationGtag',
    '@walkeros/web-destination-api': 'walkerOSDestinationApi',
    '@walkeros/web-destination-meta': 'walkerOSDestinationMeta',
    '@walkeros/web-destination-plausible': 'walkerOSDestinationPlausible',
    '@walkeros/web-destination-piwikpro': 'walkerOSDestinationPiwikpro',
  };

  return packageMap[packageName] || null;
}

/**
 * Generate walkerOS initialization code from Flow configuration
 * Implements parts 2, 3, and 4 of the bundle structure
 */
function generateInitCode(config: Flow.Config): string {
  const parts: string[] = [];

  // Part 2: Configuration Values
  parts.push('// 2. CONFIGURATION VALUES');
  parts.push('// Direct use of Flow config');
  parts.push(`const flowConfig = ${JSON.stringify(config, null, 2)};`);
  parts.push('');

  // Part 3: Executing Code
  parts.push('// 3. EXECUTING CODE');
  parts.push('// Functions that combine packages with configuration');
  parts.push('async function initializeWalkerOS() {');
  parts.push('  const collectorConfig = {};');
  parts.push('');

  // Map Flow nodes to collector configuration
  parts.push('  // Map Flow nodes to collector configuration');
  parts.push('  flowConfig.nodes.forEach(node => {');
  parts.push('    if (node.type === "source") {');
  parts.push('      collectorConfig.sources = collectorConfig.sources || {};');
  parts.push(
    '      // Use real source package - extract sourceBrowser from browser source package',
  );
  parts.push(
    '      var sourceFn = walkerOSSourceBrowser.sourceBrowser || walkerOSSourceBrowser.default;',
  );
  parts.push('      // Add defensive scope handling for browser sources');
  parts.push('      var sourceConfig = {...node.config};');
  parts.push(
    '      if (sourceConfig.settings && sourceConfig.settings.scope === "body") {',
  );
  parts.push('        // Ensure document.body exists or fallback to document');
  parts.push(
    '        sourceConfig.settings.scope = document.body || document;',
  );
  parts.push('      }');
  parts.push(
    '      collectorConfig.sources[node.id] = walkerOSCore.createSource(sourceFn, sourceConfig);',
  );
  parts.push('    } else if (node.type === "destination") {');
  parts.push(
    '      collectorConfig.destinations = collectorConfig.destinations || {};',
  );
  parts.push('      // Use real destination package - extract destinationGtag');
  parts.push(
    '      var destObj = walkerOSDestinationGtag.destinationGtag || walkerOSDestinationGtag.default;',
  );
  parts.push(
    '      collectorConfig.destinations[node.id] = {...destObj, config: node.config};',
  );
  parts.push('    } else if (node.type === "collector") {');
  parts.push('      Object.assign(collectorConfig, node.config);');
  parts.push('    }');
  parts.push('  });');
  parts.push('');

  parts.push(
    '  const {collector, elb} = await walkerOSCollector.createCollector(collectorConfig);',
  );
  parts.push('  return collector;');
  parts.push('}');
  parts.push('');

  // Part 4: Final Execution
  parts.push('// 4. FINAL EXECUTION');
  parts.push('// DOM-ready execution and direct assignment');
  parts.push('function initializeWhenReady() {');
  parts.push('  initializeWalkerOS().then(collector => {');
  parts.push('    window.walkerOS = collector;  // Direct assignment');
  parts.push('  }).catch(error => {');
  parts.push('    console.error("WalkerOS initialization failed:", error);');
  parts.push('  });');
  parts.push('}');
  parts.push('');
  parts.push('// Ensure DOM is ready before initializing browser sources');
  parts.push('if (document.readyState === "loading") {');
  parts.push(
    '  document.addEventListener("DOMContentLoaded", initializeWhenReady);',
  );
  parts.push('} else {');
  parts.push('  // DOM is already ready');
  parts.push('  initializeWhenReady();');
  parts.push('}');

  return parts.join('\n');
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
