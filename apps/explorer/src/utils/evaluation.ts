/**
 * JavaScript Evaluation Utilities
 *
 * Provides safe JavaScript evaluation with context injection
 * and result formatting for explorer components.
 */

export interface EvaluationContext {
  [key: string]: unknown;
}

export interface EvaluationResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime?: number;
}

/**
 * Safely evaluate JavaScript code with injected context
 */
export async function evaluateJavaScript(
  code: string,
  context: EvaluationContext = {},
): Promise<EvaluationResult> {
  const startTime = performance.now();

  try {
    // Create function with context variables as parameters
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Wrap code in async function to support await
    const wrappedCode = `
      "use strict";
      return (async () => {
        ${code}
      })();
    `;

    // Create and execute function with context
    const evalFunction = new Function(...contextKeys, wrappedCode);
    const result = await evalFunction(...contextValues);

    const executionTime = performance.now() - startTime;

    return {
      success: true,
      result,
      executionTime,
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    };
  }
}

/**
 * Format evaluation result for display
 */
export function formatEvaluationResult(result: unknown): string {
  if (result === undefined) {
    return 'undefined';
  }

  if (result === null) {
    return 'null';
  }

  if (typeof result === 'string') {
    return result; // Don't add quotes around strings
  }

  if (typeof result === 'number' || typeof result === 'boolean') {
    return String(result);
  }

  if (typeof result === 'function') {
    return '[Function]';
  }

  if (typeof result === 'object') {
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return '[Object]';
    }
  }

  return String(result);
}

/**
 * Validate JavaScript code for basic syntax errors
 */
export function validateJavaScript(code: string): {
  valid: boolean;
  error?: string;
} {
  try {
    new Function(code);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a safe evaluation context with common utilities
 */
export function createSafeContext(
  additionalContext: EvaluationContext = {},
): EvaluationContext {
  const safeContext: EvaluationContext = {
    // Safe built-ins
    console: {
      log: (...args: unknown[]) => console.log(...args),
      error: (...args: unknown[]) => console.error(...args),
      warn: (...args: unknown[]) => console.warn(...args),
    },
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,

    // Add user context
    ...additionalContext,
  };

  return safeContext;
}
