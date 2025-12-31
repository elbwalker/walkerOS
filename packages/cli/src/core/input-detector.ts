/**
 * Input Detector
 *
 * Detects whether CLI input is a config JSON or pre-built bundle.
 * Supports both local files and URLs.
 */

import fs from 'fs-extra';
import { isUrl } from '../config/utils.js';

export type Platform = 'web' | 'server';

export type DetectedInput =
  | { type: 'config'; content: string }
  | { type: 'bundle'; content: string; platform: Platform };

/**
 * Detect if input is config JSON or pre-built bundle.
 *
 * Detection: Try JSON.parse, if fails = bundle
 * Platform: .mjs = server, .js = web
 *
 * @param inputPath - Path to file or URL
 * @param platformOverride - Optional platform override
 * @returns Detected input type with content
 */
export async function detectInput(
  inputPath: string,
  platformOverride?: Platform,
): Promise<DetectedInput> {
  // Load content (URL or local file)
  const content = await loadContent(inputPath);

  // Try parsing as JSON
  try {
    JSON.parse(content);
    return { type: 'config', content };
  } catch {
    // Not JSON, treat as bundle
    const platform = platformOverride ?? detectPlatformFromPath(inputPath);
    return { type: 'bundle', content, platform };
  }
}

/**
 * Detect platform from file extension.
 *
 * @param inputPath - Path to file or URL
 * @returns Platform based on extension (.mjs = server, .js = web)
 */
export function detectPlatformFromPath(inputPath: string): Platform {
  // Remove query params for URLs
  const cleanPath = inputPath.split('?')[0];
  return cleanPath.endsWith('.mjs') ? 'server' : 'web';
}

/**
 * Load content from URL or local file.
 *
 * @param inputPath - Path to file or URL
 * @returns File content as string
 */
async function loadContent(inputPath: string): Promise<string> {
  if (isUrl(inputPath)) {
    const response = await fetch(inputPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${inputPath}: ${response.status}`);
    }
    return response.text();
  }
  return fs.readFile(inputPath, 'utf8');
}
