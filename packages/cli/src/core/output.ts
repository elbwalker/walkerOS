/**
 * Output formatting utilities for CLI commands
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Write command result to stdout or file.
 * Used by all commands to implement -o/--output flag.
 */
export async function writeResult(
  content: string | Buffer,
  options: { output?: string },
): Promise<void> {
  if (options.output) {
    const outputPath = path.resolve(options.output);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, content);
  } else {
    process.stdout.write(content);
  }
}

export interface JsonOutput<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
}

/**
 * Create standardized JSON output for CLI commands
 */
export function createJsonOutput<T = Record<string, unknown>>(
  success: boolean,
  data?: T,
  error?: string,
  duration?: number,
): JsonOutput<T> {
  return {
    success,
    ...(data && { data }),
    ...(error && { error }),
    ...(duration && { duration }),
  };
}

/**
 * Create success JSON output
 */
export function createSuccessOutput<T = Record<string, unknown>>(
  data?: T,
  duration?: number,
): JsonOutput<T> {
  return createJsonOutput(true, data, undefined, duration);
}

/**
 * Create error JSON output
 */
export function createErrorOutput(
  error: string,
  duration?: number,
): JsonOutput<never> {
  return createJsonOutput<never>(false, undefined, error, duration);
}

/**
 * Format bytes to KB with 2 decimal places
 */
export function formatBytes(bytes: number): string {
  return (bytes / 1024).toFixed(2);
}

/**
 * Format file size with appropriate unit
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
