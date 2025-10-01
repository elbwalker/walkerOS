import vm from 'vm';
import { JSDOM } from 'jsdom';
import type { SimulationResult } from './types';
import { createApiTracker, logApiUsage, type ApiCall } from './api-tracker';

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
    (window as typeof window & { global: typeof window }).global = window;
    const context = vm.createContext(window);

    // Mock Performance API for browser code compatibility
    const performanceStartTime = Date.now();
    Object.defineProperty(context, 'performance', {
      value: {
        now: () => Date.now() - performanceStartTime,
        getEntriesByType: (type: string) => {
          if (type === 'navigation') {
            return [
              {
                type: 'navigate', // Default to 'navigate' type for new sessions
                redirectCount: 0,
                duration: 100,
              },
            ];
          }
          return [];
        },
        mark: () => {},
        measure: () => {},
        clearMarks: () => {},
        clearMeasures: () => {},
      },
      writable: false,
      configurable: true,
    });

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
