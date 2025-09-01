import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import type { Flow } from '@walkeros/core';
import { ParseError } from '../types';

/**
 * Read and parse Flow configuration from JSON file
 */
export function readFlowConfig(filePath: string): Flow.Config {
  try {
    const absolutePath = resolve(filePath);
    const content = readFileSync(absolutePath, 'utf-8');

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (jsonError) {
      throw new ParseError(`Invalid JSON in file ${filePath}`, { jsonError });
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new ParseError(
        `Flow configuration must be a JSON object in ${filePath}`,
      );
    }

    return parsed as Flow.Config;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ParseError(`Flow configuration file not found: ${filePath}`);
    }

    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new ParseError(`Permission denied reading file: ${filePath}`);
    }

    throw new ParseError(`Failed to read Flow configuration from ${filePath}`, {
      error,
    });
  }
}

/**
 * Ensure directory exists for the given file path
 */
export function ensureDirectoryExists(filePath: string): void {
  try {
    const absolutePath = resolve(filePath);
    const directory = dirname(absolutePath);
    mkdirSync(directory, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(`Permission denied creating directory for: ${filePath}`);
    }
    throw new Error(
      `Failed to create directory for ${filePath}: ${(error as Error).message}`,
    );
  }
}

/**
 * Write bundle to output file
 */
export function writeBundleFile(filePath: string, bundle: string): void {
  try {
    // Ensure directory exists first
    ensureDirectoryExists(filePath);

    const absolutePath = resolve(filePath);
    writeFileSync(absolutePath, bundle, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(`Permission denied writing to file: ${filePath}`);
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOTDIR') {
      throw new Error(`Directory does not exist for file: ${filePath}`);
    }

    throw new Error(
      `Failed to write bundle to ${filePath}: ${(error as Error).message}`,
    );
  }
}

/**
 * Check if file path has proper extension
 */
export function validateFlowConfigPath(filePath: string): void {
  if (!filePath.endsWith('.json')) {
    throw new ParseError('Flow configuration file must have .json extension');
  }
}

/**
 * Check if value is a JSON string (starts with { or [)
 */
export function isJsonString(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

/**
 * Parse Flow configuration from JSON string
 */
export function parseFlowConfigString(jsonString: string): Flow.Config {
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (jsonError) {
      throw new ParseError(`Invalid JSON in string input`, { jsonError });
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new ParseError(`Flow configuration must be a JSON object`);
    }

    return parsed as Flow.Config;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }

    throw new ParseError(
      `Failed to parse Flow configuration from JSON string`,
      { error },
    );
  }
}

/**
 * Smart Flow config loader - detects JSON string vs file path
 */
export function loadFlowConfig(input: string): Flow.Config {
  if (isJsonString(input)) {
    return parseFlowConfigString(input);
  } else {
    return readFlowConfig(input);
  }
}

/**
 * Check if output path has proper extension
 */
export function validateBundlePath(filePath: string): void {
  if (!filePath.endsWith('.js')) {
    throw new Error('Output bundle file must have .js extension');
  }
}
