import { writeCache, readCache, readCacheConfig } from '../../runtime/cache.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_CACHE_DIR = '/tmp/walkeros-cache-test';
const TEST_BUNDLE_PATH = '/tmp/walkeros-test-bundle.mjs';

beforeEach(() => {
  // Clean up
  if (existsSync(TEST_CACHE_DIR)) rmSync(TEST_CACHE_DIR, { recursive: true });
  if (existsSync(TEST_BUNDLE_PATH)) rmSync(TEST_BUNDLE_PATH);

  // Create a test bundle file
  writeFileSync(TEST_BUNDLE_PATH, 'export default function() {}', 'utf-8');
});

afterAll(() => {
  if (existsSync(TEST_CACHE_DIR)) rmSync(TEST_CACHE_DIR, { recursive: true });
  if (existsSync(TEST_BUNDLE_PATH)) rmSync(TEST_BUNDLE_PATH);
});

describe('writeCache', () => {
  it('copies bundle and writes meta.json + config.json', () => {
    writeCache(TEST_CACHE_DIR, TEST_BUNDLE_PATH, '{"version":1}', 'v1');

    expect(existsSync(join(TEST_CACHE_DIR, 'bundle.mjs'))).toBe(true);
    expect(existsSync(join(TEST_CACHE_DIR, 'meta.json'))).toBe(true);
    expect(existsSync(join(TEST_CACHE_DIR, 'config.json'))).toBe(true);
  });

  it('creates cache directory if it does not exist', () => {
    const nested = join(TEST_CACHE_DIR, 'nested', 'dir');
    writeCache(nested, TEST_BUNDLE_PATH, '{"version":1}', 'v1');
    expect(existsSync(join(nested, 'bundle.mjs'))).toBe(true);
  });
});

describe('readCache', () => {
  it('returns bundlePath and version if cache exists', () => {
    writeCache(TEST_CACHE_DIR, TEST_BUNDLE_PATH, '{"version":1}', 'v1');
    const result = readCache(TEST_CACHE_DIR);
    expect(result).not.toBeNull();
    expect(result!.bundlePath).toBe(join(TEST_CACHE_DIR, 'bundle.mjs'));
    expect(result!.version).toBe('v1');
  });

  it('returns null if no cache', () => {
    const result = readCache('/tmp/nonexistent-cache-dir');
    expect(result).toBeNull();
  });

  it('returns null if meta.json is corrupt', () => {
    mkdirSync(TEST_CACHE_DIR, { recursive: true });
    writeFileSync(join(TEST_CACHE_DIR, 'bundle.mjs'), 'content', 'utf-8');
    writeFileSync(join(TEST_CACHE_DIR, 'meta.json'), 'not-json', 'utf-8');
    const result = readCache(TEST_CACHE_DIR);
    expect(result).toBeNull();
  });
});

describe('readCacheConfig', () => {
  it('returns config JSON if cached', () => {
    writeCache(TEST_CACHE_DIR, TEST_BUNDLE_PATH, '{"version":1}', 'v1');
    const config = readCacheConfig(TEST_CACHE_DIR);
    expect(config).toBe('{"version":1}');
  });

  it('returns null if no config cached', () => {
    const config = readCacheConfig('/tmp/nonexistent-cache-dir');
    expect(config).toBeNull();
  });
});
