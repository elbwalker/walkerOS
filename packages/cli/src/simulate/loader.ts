import vm from 'vm';
import path from 'path';
import fs from 'fs-extra';
import { JSDOM } from 'jsdom';
import type { WalkerOS } from '@walkeros/core';
import { loadJsonConfig, createLogger, getTempDir } from '../core';
import { parseBundleConfig, type BundleConfig } from '../bundle/config';
import { bundle } from '../bundle/bundler';
import type { SimulationResult } from './types';
import { createApiTracker, type ApiCall } from './api-tracker';

/**
 * Logs API usage calls to the vmUsage record
 */
function logApiUsage(
  vmUsage: Record<string, ApiCall[]>,
  name: string,
  call: ApiCall,
): void {
  if (!vmUsage[name]) vmUsage[name] = [];
  vmUsage[name].push(call);
}

/**
 * Executes JavaScript code in a JSDOM VM context using async IIFE pattern
 */
export async function executeInVM(
  bundleCode: string,
): Promise<SimulationResult> {
  try {
    // Setup JSDOM window context
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://example.com',
      pretendToBeVisual: true,
      resources: 'usable',
    });

    // Create VM context with JSDOM window
    const { window } = dom;
    (window as any).global = window;
    const context = vm.createContext(window);

    // Inject functions into VM context
    context.createApiTracker = createApiTracker;
    context.logApiUsage = logApiUsage;

    // Wrap bundle in async IIFE that returns result
    const wrappedCode = `
      (async () => {
        try {
          // Execute the bundled code
          ${bundleCode}
          
          // Extract results from VM context
          const vmResult = globalThis.vmResult || {};
          
          return {
            success: true,
            ...vmResult,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      })()
    `;

    // Execute and await the result
    const script = new vm.Script(wrappedCode, { filename: 'bundle.js' });
    const result = await script.runInContext(context);

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate bundle code from config (similar to bundle command)
 */
async function generateBundleCode(config: BundleConfig): Promise<string> {
  // Create a silent logger for bundle generation
  const logger = createLogger({ silent: true });

  // Create temporary bundle and return the generated code
  const tempDir = getTempDir();
  const tempOutput = {
    ...config.output,
    dir: tempDir,
    filename: 'simulation-bundle.js',
  };

  const tempConfig = {
    ...config,
    build: {
      ...config.build,
      format: 'cjs' as const, // Override with CommonJS for simulation
    },
    output: tempOutput,
  };

  try {
    // Generate bundle
    await bundle(tempConfig, logger, false);

    // Read the generated file
    const bundlePath = path.join(tempDir, tempOutput.filename);
    const bundleCode = await fs.readFile(bundlePath, 'utf-8');

    // Transform the IIFE to assign to module.exports for simulation
    const modifiedCode = bundleCode.replace(
      /(\(async function\(\) \{[\s\S]+?\}\)\(\));?$/m,
      'module.exports = $1;',
    );

    // Cleanup temp files
    await fs.remove(tempDir);

    return modifiedCode;
  } catch (error) {
    // Cleanup on error
    await fs.remove(tempDir).catch(() => {});
    throw error;
  }
}

/**
 * Execute simulation with real walkerOS implementation
 */
export async function executeSimulation(
  event: unknown,
  configPath: string,
): Promise<SimulationResult> {
  try {
    // Generate real bundle from config
    const rawConfig = await loadJsonConfig(configPath);
    const config = parseBundleConfig(rawConfig);

    // Create bundle using the bundle system
    const bundleCode = await generateBundleCode(config);

    // The CJS bundle now assigns to module.exports, so we can access it
    const wrappedBundleCode = `
      // Set up module context
      const module = { exports: {} };
      const exports = module.exports;
      const vmLogs = [];
      const vmUsage = {};
      
      // Override console.log to capture logs
      console.log = (...args) => {
        vmLogs.push(args);
      };
      
      // Test console.log capture
      console.log("simulation start");

      // Execute the CJS bundle (sets module.exports)
      ${bundleCode}
      
      // Get the collector from module.exports
      const flow = await module.exports;

      // Enable error logging @TODO should be part of the flow config
      flow.collector.config.onError = console.log
      
      // Set up dynamic API tracking for each destination
      if (flow && flow.collector && flow.collector.destinations) {
        Object.entries(flow.collector.destinations).forEach(([name, destination]) => {
          // Try to get examples from multiple sources
          let examples = destination.examples || destination.code?.examples;
          
          // Try to get examples from the dynamically generated examples object
          if (!examples && typeof globalThis.examples !== 'undefined') {
            examples = globalThis.examples[name];
          }
          
          // Start with minimal window/document objects
          let baseEnv = {
            window,
            document
          };
          
          let trackingPaths = ['call:*']; // Default fallback
          
          // Apply tracking to the entire env
          const trackedEnv = createApiTracker(
            baseEnv,
            (call) => logApiUsage(vmUsage, name, call),
            trackingPaths
          );
          
          destination.env = trackedEnv;
        });
      }

      // Test event execution with generated collector
      const testEvent = ${JSON.stringify(event)};
      
      // The bundle should return { collector, elb } from createCollector
      if (flow && typeof flow.elb === 'function') {
        const elbResult = await flow.elb(testEvent);
        
        // Store results for VM extraction
        globalThis.vmResult = {
          collector: flow.collector,
          elbResult,
          logs: vmLogs,
          usage: vmUsage
        };
      } else {
        throw new Error('Bundle did not return valid collector with elb function');
      }
    `;

    const vmResult = await executeInVM(wrappedBundleCode);

    return vmResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
