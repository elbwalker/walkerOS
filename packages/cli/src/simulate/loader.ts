import vm from 'vm';
import { JSDOM } from 'jsdom';
import type { WalkerOS } from '@walkeros/core';

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
 * Execute simulation with mocked walkerOS implementation
 */
export async function executeSimulation(
  event: WalkerOS.Event,
): Promise<{ success: boolean; error?: string }> {
  // Mock bundle code for testing
  const mockBundle = `
    // Mock walkerOS createCollector
    const createCollector = async (config) => {
      const collector = { 
        queue: [],
        push: (event) => collector.queue.push(event)
      };
      
      const elb = async (event) => {
        collector.push(event);
        return { 
          ok: true, 
          event,
          successful: [event],
          queued: [],
          failed: []
        };
      };
      
      return { collector, elb };
    };
    
    // Execute mock
    const result = await createCollector({});
    
    // Test event execution
    const testEvent = ${JSON.stringify(event)};
    const elbResult = await result.elb(testEvent);
    
    // Store results
    globalThis.vmResult = {
      elb: result.elb,
      collector: result.collector,
      elbResult,
      event: testEvent
    };
  `;

  const vmResult = await executeInVM(mockBundle);

  return {
    success: vmResult.success,
    error: vmResult.error,
  };
}
