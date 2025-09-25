import vm from 'vm';
import path from 'path';
import fs from 'fs-extra';
import { JSDOM } from 'jsdom';
import type { WalkerOS } from '@walkeros/core';
import { loadJsonConfig, createLogger, getTempDir } from '../core';
import { parseBundleConfig, type BundleConfig } from '../bundle/config';
import { bundle } from '../bundle/bundler';

export interface VMExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

/**
 * Executes JavaScript code in a JSDOM VM context using async IIFE pattern
 */
export async function executeInVM(
  bundleCode: string,
): Promise<VMExecutionResult> {
  const startTime = Date.now();

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
            data: vmResult
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

    const duration = Date.now() - startTime;

    return {
      success: result.success,
      data: result.data,
      error: result.error,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
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
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate real bundle from config
    const configPath = path.resolve(
      __dirname,
      '../../examples/web-ecommerce.json',
    );
    const rawConfig = await loadJsonConfig(configPath);
    const config = parseBundleConfig(rawConfig);

    // Create bundle using the bundle system
    const bundleCode = await generateBundleCode(config);

    // The CJS bundle now assigns to module.exports, so we can access it
    const wrappedBundleCode = `
      // Set up module context
      const module = { exports: {} };
      const exports = module.exports;
      
      // Execute the CJS bundle (sets module.exports)
      ${bundleCode}
      
      // Get the collector from module.exports
      const collectorResult = await module.exports;
      
      // Test event execution with generated collector
      const testEvent = ${JSON.stringify(event)};
      
      // The bundle should return { collector, elb } from createCollector
      if (collectorResult && typeof collectorResult.elb === 'function') {
        const elbResult = await collectorResult.elb(testEvent.name || 'page view', testEvent.data || {});
        
        // Store results for VM extraction
        globalThis.vmResult = {
          elb: collectorResult.elb,
          collector: collectorResult.collector,
          elbResult,
          event: testEvent
        };
      } else {
        throw new Error('Bundle did not return valid collector with elb function');
      }
    `;

    const vmResult = await executeInVM(wrappedBundleCode);

    return {
      success: vmResult.success,
      error: vmResult.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
