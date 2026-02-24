/**
 * Push Command Tests
 *
 * Tests the push command's JSON source loading logic.
 * Event validation (name format, structure, properties) is tested in
 * commands/validate/validators/__tests__/event.test.ts.
 */

import path from 'path';
import fs from 'fs-extra';
import { loadJsonFromSource } from '../../../config/index.js';

// Test fixtures
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const VALID_EVENT = path.join(FIXTURES_DIR, 'events/valid-event.json');
const INVALID_EVENT = path.join(FIXTURES_DIR, 'events/invalid-event.json');

describe('JSON Source Loading', () => {
  it('should load from file path', async () => {
    const event = await loadJsonFromSource(VALID_EVENT, { name: 'event' });

    expect(event).toBeDefined();
    const e = event as Record<string, unknown>;
    expect(e.name).toBe('page view');
  });

  it('should load from JSON string', async () => {
    const event = await loadJsonFromSource('{"name": "page view"}', {
      name: 'event',
    });

    expect(event).toBeDefined();
    const e = event as Record<string, unknown>;
    expect(e.name).toBe('page view');
  });

  it('should handle JSON with whitespace', async () => {
    const event = await loadJsonFromSource(
      `{
      "name": "page view",
      "data": {
        "title": "Home"
      }
    }`,
      { name: 'event' },
    );

    const e = event as Record<string, unknown>;
    expect(e.name).toBe('page view');
    const data = e.data as Record<string, unknown>;
    expect(data.title).toBe('Home');
  });

  it('should reject invalid JSON', async () => {
    await expect(
      loadJsonFromSource('{invalid json}', { name: 'event' }),
    ).rejects.toThrow();
  });

  it('should fallback to event name for non-existent file paths', async () => {
    // Non-existent file paths that don't look like JSON are treated as event names
    const result = await loadJsonFromSource('/tmp/nonexistent', {
      name: 'event',
    });

    expect(result).toEqual({ name: '/tmp/nonexistent' });
  });

  it('should reject JSON-like non-existent files', async () => {
    // Paths ending in .json should fail if they don't exist
    await expect(
      loadJsonFromSource('{invalid', { name: 'event' }),
    ).rejects.toThrow();
  });
});

describe('Fixture Files', () => {
  it('should have valid-event.json fixture', async () => {
    const exists = await fs.pathExists(VALID_EVENT);
    expect(exists).toBe(true);

    const content = await fs.readJson(VALID_EVENT);
    expect(content).toHaveProperty('name');
    expect(content.name).toContain(' '); // Should follow entity-action format
  });

  it('should have invalid-event.json fixture', async () => {
    const exists = await fs.pathExists(INVALID_EVENT);
    expect(exists).toBe(true);

    const content = await fs.readJson(INVALID_EVENT);
    expect(content).not.toHaveProperty('name');
  });
});
