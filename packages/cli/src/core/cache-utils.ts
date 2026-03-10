/**
 * Cache utility functions for hash-based cache keys
 *
 * Implements content-based and date-based cache invalidation for:
 * - NPM package cache (mutable versions include daily date)
 * - Build artifact cache (content + date hashing)
 */

import { getHashServer } from '@walkeros/server-core';
import semver from 'semver';

const HASH_LENGTH = 12;

/**
 * Check if a version specifier is mutable (can change over time)
 */
export function isMutableVersion(version: string): boolean {
  // Dist tags (latest, next, beta, etc.) are mutable — they can point to
  // different versions over time, so caching must include a date component.
  // A version is immutable only if it's an exact semver (e.g., "1.2.3").
  if (semver.valid(version)) return false;
  return true;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate cache key for npm package.
 * Mutable versions include date for daily invalidation.
 * Exact versions are cached indefinitely.
 */
export async function getPackageCacheKey(
  packageName: string,
  version: string,
  date?: string,
): Promise<string> {
  const safeName = packageName.replace(/\//g, '-').replace(/@/g, '');

  if (isMutableVersion(version)) {
    const dateStr = date ?? getTodayDate();
    const input = `${safeName}@${version}:${dateStr}`;
    return getHashServer(input, HASH_LENGTH);
  }

  // Exact version - no date component
  const input = `${safeName}@${version}`;
  return getHashServer(input, HASH_LENGTH);
}

/**
 * Normalize JSON content for consistent hashing.
 * Handles whitespace and property order variations.
 */
function normalizeJson(content: string): string {
  const parsed = JSON.parse(content);
  return JSON.stringify(parsed);
}

/**
 * Generate cache key for flow.json configuration.
 * Includes date for daily rebuild guarantee.
 */
export async function getFlowSettingsCacheKey(
  content: string,
  date?: string,
): Promise<string> {
  const dateStr = date ?? getTodayDate();
  const normalized = normalizeJson(content);
  const input = `${normalized}:${dateStr}`;
  return getHashServer(input, HASH_LENGTH);
}
