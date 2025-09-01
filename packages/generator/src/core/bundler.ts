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
 */
function transformPackageCode(resolvedPackages: ResolvedPackage[]): string {
  const packageSections: string[] = [];

  for (const resolved of resolvedPackages) {
    const transformedCode = transformESModuleToCommonJS(resolved.code);
    packageSections.push(
      `// ${resolved.package.name}@${resolved.package.version} (${resolved.package.type})\n${transformedCode}`,
    );
  }

  return packageSections.join('\n\n');
}

/**
 * Transform ES module syntax to CommonJS/IIFE compatible format
 * Note: This is a simple transformation for already-processed code from resolver
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
 * Generate walkerOS initialization code from Flow configuration
 */
function generateInitCode(config: Flow.Config): string {
  const parts: string[] = [];

  parts.push('// WalkerOS Initialization');
  parts.push('async function initWalkerOS() {');
  parts.push('  try {');

  // Generate collector configuration
  const collectorConfig = generateCollectorConfig(config);
  parts.push(
    `    const collectorConfig = ${JSON.stringify(collectorConfig, null, 4)};`,
  );
  parts.push('');

  // Initialize collector
  parts.push(
    '    const { collector, elb } = await createCollector(collectorConfig);',
  );
  parts.push('');

  // Set up global exposure
  parts.push('    // Expose to global scope');
  parts.push('    window.walkerOS = {');
  parts.push('      collector,');
  parts.push('      elb,');
  parts.push('      version: "generated"');
  parts.push('    };');
  parts.push('');
  parts.push('    // Legacy support');
  parts.push('    window.elb = elb;');
  parts.push('');

  parts.push('    console.log("WalkerOS initialized successfully");');
  parts.push('    return { collector, elb };');
  parts.push('  } catch (error) {');
  parts.push('    console.error("Failed to initialize WalkerOS:", error);');
  parts.push('    throw error;');
  parts.push('  }');
  parts.push('}');
  parts.push('');

  // Auto-initialize
  parts.push('// Auto-initialize');
  parts.push('if (typeof window !== "undefined") {');
  parts.push('  if (document.readyState === "loading") {');
  parts.push(
    '    document.addEventListener("DOMContentLoaded", initWalkerOS);',
  );
  parts.push('  } else {');
  parts.push('    initWalkerOS();');
  parts.push('  }');
  parts.push('}');

  return parts.join('\n');
}

/**
 * Generate collector configuration from Flow configuration
 */
function generateCollectorConfig(config: Flow.Config): Record<string, unknown> {
  const collectorConfig: Record<string, unknown> = {
    sources: {},
    destinations: {},
  };

  // Find collector node for base configuration
  const collectorNode = config.nodes.find((node) => node.type === 'collector');
  if (collectorNode) {
    Object.assign(collectorConfig, collectorNode.config);
  }

  // Add sources
  const sourceNodes = config.nodes.filter((node) => node.type === 'source');
  for (const source of sourceNodes) {
    (collectorConfig.sources as Record<string, unknown>)[source.id] = {
      package: source.package,
      config: source.config,
    };
  }

  // Add destinations
  const destinationNodes = config.nodes.filter(
    (node) => node.type === 'destination',
  );
  for (const destination of destinationNodes) {
    (collectorConfig.destinations as Record<string, unknown>)[destination.id] =
      {
        package: destination.package,
        config: destination.config,
      };
  }

  return collectorConfig;
}

/**
 * Create IIFE bundle wrapper
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
