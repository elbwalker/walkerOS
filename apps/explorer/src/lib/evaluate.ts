/**
 * JavaScript Evaluation Utilities
 * Safe code execution with context injection
 */

import type { EvaluationResult } from '../types';
import { tryCatch, tryCatchAsync } from '@walkeros/core';

/**
 * Create a safe execution context
 */
export function createContext(
  contextObject: Record<string, unknown> = {},
): Record<string, unknown> {
  // Filter out potentially dangerous properties
  const safeContext: Record<string, unknown> = {};

  Object.entries(contextObject).forEach(([key, value]) => {
    // Skip dangerous globals
    if (['eval', 'Function', 'constructor', '__proto__'].includes(key)) {
      return;
    }
    safeContext[key] = value;
  });

  return safeContext;
}

/**
 * Evaluate JavaScript code with injected context
 */
export async function evaluate(
  code: string,
  context: Record<string, unknown> = {},
): Promise<EvaluationResult> {
  const logs: string[] = [];

  // Create logging function
  const log = (...args: unknown[]) => {
    logs.push(args.map((arg) => formatValue(arg)).join(' '));
  };

  // Merge context with log function
  const fullContext = {
    ...createContext(context),
    console: { log },
    log,
  };

  try {
    // Create function with context parameters
    const contextKeys = Object.keys(fullContext);
    const contextValues = Object.values(fullContext);

    // Wrap code to handle both expressions and statements
    const wrappedCode = `
      'use strict';
      ${code.includes('return') ? code : `return (async () => { ${code} })()`}
    `;

    // Create and execute function
    const fn = new Function(...contextKeys, wrappedCode);
    const result = await fn(...contextValues);

    return { value: result, logs };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      logs,
    };
  }
}

/**
 * Format a value for display
 */
export function formatValue(value: unknown, indent = 2): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'function') return value.toString();

  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return String(value);
  }
}

/**
 * Parse JSON safely
 */
export function parseJSON(text: string): unknown {
  return tryCatch(
    () => JSON.parse(text),
    () => text,
  )();
}

/**
 * Detect if code is likely async
 */
export function isAsyncCode(code: string): boolean {
  return /\b(async|await|Promise|then|catch|finally)\b/.test(code);
}

/**
 * Extract error information
 */
export function formatError(error: Error | string): string {
  if (typeof error === 'string') return error;

  const message = error.message || 'Unknown error';
  const stack = error.stack?.split('\n').slice(0, 3).join('\n');

  return stack ? `${message}\n${stack}` : message;
}

/**
 * Validate JavaScript syntax without executing
 */
export function validateSyntax(code: string): {
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
 * Simple performance measurement
 */
export async function measureExecution<T>(
  fn: () => T | Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  return { result, duration };
}
