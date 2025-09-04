import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { ParseError } from '../types';
import type { PackageDefinition, GeneratorConfig } from '../types';

export interface ConfigData {
  config: GeneratorConfig;
  packages: PackageDefinition[];
}

/**
 * Read and parse collector configuration from JSON file
 */
export function readCollectorConfig(filePath: string): ConfigData {
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
        `Configuration must be a JSON object in ${filePath}`,
      );
    }

    return parsed as ConfigData;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ParseError(`Configuration file not found: ${filePath}`);
    }

    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new ParseError(`Permission denied reading file: ${filePath}`);
    }

    throw new ParseError(`Failed to read configuration from ${filePath}`, {
      error,
    });
  }
}

/**
 * Ensure directory exists for the given file path
 */
export function ensureDirectoryExists(filePath: string): void {
  const dir = dirname(resolve(filePath));
  mkdirSync(dir, { recursive: true });
}

/**
 * Write bundle to file
 */
export function writeBundleFile(filePath: string, content: string): void {
  try {
    ensureDirectoryExists(filePath);
    writeFileSync(resolve(filePath), content, 'utf-8');
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
 * Validate configuration file path and extension
 */
export function validateConfigPath(filePath: string): void {
  if (!filePath.endsWith('.json')) {
    throw new ParseError('Configuration file must have .json extension');
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
 * Parse collector configuration from JSON string
 */
export function parseCollectorConfigString(jsonString: string): ConfigData {
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (jsonError) {
      throw new ParseError(`Invalid JSON in string input`, { jsonError });
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new ParseError(`Configuration must be a JSON object`);
    }

    return parsed as ConfigData;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }

    throw new ParseError(`Failed to parse configuration from JSON string`, {
      error,
    });
  }
}

/**
 * Smart config loader - detects JSON string vs file path
 */
export function loadCollectorConfig(input: string): ConfigData {
  if (isJsonString(input)) {
    return parseCollectorConfigString(input);
  } else {
    return readCollectorConfig(input);
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
