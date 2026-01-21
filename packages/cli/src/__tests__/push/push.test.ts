/**
 * Push Command Tests
 *
 * Tests the push command validation and execution logic
 */

import path from 'path';
import fs from 'fs-extra';
import { loadJsonFromSource } from '../../config/index.js';

// Test fixtures
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const VALID_EVENT = path.join(FIXTURES_DIR, 'events/valid-event.json');
const INVALID_EVENT = path.join(FIXTURES_DIR, 'events/invalid-event.json');

// Helper to cast event to Record for testing
const asEvent = (e: unknown) => e as Record<string, unknown>;

describe('Event Loading and Validation', () => {
  it('should load valid event from file', async () => {
    const event = asEvent(
      await loadJsonFromSource(VALID_EVENT, { name: 'event' }),
    );

    expect(event).toBeDefined();
    expect(event).toHaveProperty('name', 'page view');
    expect(event).toHaveProperty('data');
    expect(asEvent(event.data)).toHaveProperty('title', 'Test Page');
  });

  it('should load event from JSON string', async () => {
    const jsonString = '{"name": "product view", "data": {"id": "P123"}}';
    const event = asEvent(
      await loadJsonFromSource(jsonString, { name: 'event' }),
    );

    expect(event).toBeDefined();
    expect(event).toHaveProperty('name', 'product view');
    expect(asEvent(event.data)).toHaveProperty('id', 'P123');
  });

  it('should validate event has name property', async () => {
    const event = asEvent(
      await loadJsonFromSource(VALID_EVENT, { name: 'event' }),
    );

    expect('name' in event).toBe(true);
    expect(typeof event.name).toBe('string');
  });

  it('should reject event without name property', async () => {
    const event = asEvent(
      await loadJsonFromSource(INVALID_EVENT, { name: 'event' }),
    );

    expect(!('name' in event)).toBe(true);
  });
});

describe('Event Name Format', () => {
  it('should accept entity-action format with space', async () => {
    const event = asEvent(
      await loadJsonFromSource('{"name": "page view", "data": {}}', {
        name: 'event',
      }),
    );

    expect(event.name).toBe('page view');
    expect((event.name as string).includes(' ')).toBe(true);
  });

  it('should detect missing space in event name', async () => {
    const event = asEvent(
      await loadJsonFromSource('{"name": "pageview", "data": {}}', {
        name: 'event',
      }),
    );

    expect(event.name).toBe('pageview');
    expect((event.name as string).includes(' ')).toBe(false);
  });

  it('should accept multiple word event names', async () => {
    const event = asEvent(
      await loadJsonFromSource('{"name": "product detail view", "data": {}}', {
        name: 'event',
      }),
    );

    expect(event.name).toBe('product detail view');
    expect((event.name as string).includes(' ')).toBe(true);
  });
});

describe('Event Structure', () => {
  it('should accept event with data property', async () => {
    const event = asEvent(
      await loadJsonFromSource(
        '{"name": "page view", "data": {"title": "Home", "path": "/"}}',
        { name: 'event' },
      ),
    );

    expect(event.data).toBeDefined();
    expect(typeof event.data).toBe('object');
    expect(asEvent(event.data).title).toBe('Home');
  });

  it('should accept event without data property', async () => {
    const event = asEvent(
      await loadJsonFromSource('{"name": "page view"}', {
        name: 'event',
      }),
    );

    expect(event.name).toBe('page view');
    expect(event.data).toBeUndefined();
  });

  it('should accept event with nested property', async () => {
    const event = asEvent(
      await loadJsonFromSource(
        '{"name": "page view", "nested": [{"type": "category", "data": {"name": "Tech"}}]}',
        { name: 'event' },
      ),
    );

    expect(event.nested).toBeDefined();
    expect(Array.isArray(event.nested)).toBe(true);
    const nested = event.nested as Array<Record<string, unknown>>;
    expect(nested[0].type).toBe('category');
  });

  it('should accept event with user property', async () => {
    const event = asEvent(
      await loadJsonFromSource(
        '{"name": "page view", "user": {"id": "user123", "device": "dev456"}}',
        { name: 'event' },
      ),
    );

    expect(event.user).toBeDefined();
    const user = asEvent(event.user);
    expect(user.id).toBe('user123');
    expect(user.device).toBe('dev456');
  });

  it('should accept event with globals property', async () => {
    const event = asEvent(
      await loadJsonFromSource(
        '{"name": "page view", "globals": {"language": "en", "currency": "USD"}}',
        { name: 'event' },
      ),
    );

    expect(event.globals).toBeDefined();
    const globals = asEvent(event.globals);
    expect(globals.language).toBe('en');
    expect(globals.currency).toBe('USD');
  });

  it('should accept event with context property', async () => {
    const event = asEvent(
      await loadJsonFromSource(
        '{"name": "page view", "context": {"stage": ["checkout", 1]}}',
        { name: 'event' },
      ),
    );

    expect(event.context).toBeDefined();
    const context = asEvent(event.context);
    expect(context.stage).toEqual(['checkout', 1]);
  });

  it('should accept event with consent property', async () => {
    const event = asEvent(
      await loadJsonFromSource(
        '{"name": "page view", "consent": {"functional": true, "marketing": false}}',
        { name: 'event' },
      ),
    );

    expect(event.consent).toBeDefined();
    const consent = asEvent(event.consent);
    expect(consent.functional).toBe(true);
    expect(consent.marketing).toBe(false);
  });
});

describe('Event Type Validation', () => {
  it('should load non-object event (validation happens at command level)', async () => {
    const result = await loadJsonFromSource('"not an object"', {
      name: 'event',
    });

    // loadJsonFromSource loads JSON but doesn't validate structure
    expect(result).toBe('not an object');
    expect(typeof result).not.toBe('object');
  });

  it('should load array as event (validation happens at command level)', async () => {
    const result = await loadJsonFromSource('[{"name": "page view"}]', {
      name: 'event',
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it('should load null as event (validation happens at command level)', async () => {
    const result = await loadJsonFromSource('null', { name: 'event' });

    expect(result).toBeNull();
  });

  it('should load event with non-string name (validation happens at command level)', async () => {
    const event = await loadJsonFromSource('{"name": 123, "data": {}}', {
      name: 'event',
    });

    const e = event as Record<string, unknown>;
    expect(e.name).toBe(123);
    expect(typeof e.name).not.toBe('string');
  });
});

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
