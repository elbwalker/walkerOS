import path from 'path';
import fs from 'fs-extra';
import { isObject } from '@walkeros/core';
import { loadJsonConfig, createLogger, getTempDir } from '../core';
import { parseBundleConfig, type BundleConfig } from '../bundle/config';
import { bundle } from '../bundle/bundler';
import { executeInVM } from './loader';
import { createApiTracker, logApiUsage } from './api-tracker';
import type { SimulateCommandOptions, SimulationResult } from './types';
import type { WalkerOS } from '@walkeros/core';

/**
 * Main simulation orchestrator
 */
export async function simulate(
  configPath: string,
  event: unknown,
  options: Pick<SimulateCommandOptions, 'json' | 'verbose'> = {},
): Promise<SimulationResult> {
  const logger = createLogger({
    verbose: options.verbose || false,
    silent: false,
    json: options.json || false,
  });

  try {
    logger.info('🎯 Starting walkerOS simulation...');

    // Step 1: Load and parse configuration (for future use)
    logger.info('📦 Loading bundle configuration...');
    const fullConfigPath = path.resolve(configPath);
    const rawConfig = await loadJsonConfig(fullConfigPath);
    parseBundleConfig(rawConfig); // Validate config format

    // Step 2: Execute simulation
    logger.info(`🚀 Executing simulation with event: ${event}`);
    const result = await executeSimulation(event, fullConfigPath);

    // Step 3: Report results
    if (result.success) {
      logger.info(`✅ Simulation completed successfully`);
    } else {
      logger.error(`❌ Simulation failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`💥 Simulation error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Simple event parsing - just parse JSON
 */
export function parseEventInput(eventString: string = ''): unknown {
  const event = JSON.parse(eventString);

  return isObject(event) ? event : {};
}

/**
 * Simple result formatting
 */
export function formatSimulationResult(
  result: SimulationResult,
  options: Pick<SimulateCommandOptions, 'json'> = {},
): string {
  if (options.json) {
    const output = {
      result: result.elbResult,
      usage: result.usage,
      duration: result.duration,
    };
    return JSON.stringify(output, null, 2);
  }

  if (result.success) {
    return '✅ Simulation completed successfully';
  } else {
    return `❌ Simulation failed: ${result.error}`;
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
  const tempOutput = path.join(tempDir, 'simulation-bundle.js');

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
    const bundleCode = await fs.readFile(tempOutput, 'utf-8');

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

      // Enable error logging for simulation debugging
      flow.collector.config.onError = function(error) {
        vmLogs.push(['ERROR:', error]);
      };
      
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
