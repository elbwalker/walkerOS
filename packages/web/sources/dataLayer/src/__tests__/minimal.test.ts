import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import {
  createMockPush,
  getDataLayer,
  createDataLayerSource,
} from './test-utils';

describe('DataLayer Source - Minimal', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;

  beforeEach(async () => {
    // Clear any existing dataLayer
    delete window.dataLayer;
    collectedEvents = [];

    // Create a simple synchronous mock
    const mockPush = createMockPush(collectedEvents);

    // Initialize collector
    ({ collector } = await startFlow({
      tagging: 2,
    }));

    // Override push with synchronous mock
    collector.push = mockPush;
  });

  test('source initializes without errors', async () => {
    // Should not throw
    expect(async () => {
      await createDataLayerSource(collector);
    }).not.toThrow();
  });

  test('creates dataLayer if it does not exist', async () => {
    expect(window.dataLayer).toBeUndefined();

    await createDataLayerSource(collector);

    expect(window.dataLayer).toBeDefined();
    expect(Array.isArray(window.dataLayer)).toBe(true);
  });

  test('processes simple dataLayer event', async () => {
    await createDataLayerSource(collector);

    // Push a simple event
    getDataLayer().push({ event: 'test_event', test: 'data' });

    // Should have captured the event immediately (synchronous)
    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      name: 'dataLayer test_event',
      data: { test: 'data' },
      source: { type: 'dataLayer' },
    });
  });

  test('processes existing events on initialization', async () => {
    // Pre-populate dataLayer
    window.dataLayer = [
      { event: 'existing_event_1', data: 'test1' },
      { event: 'existing_event_2', data: 'test2' },
    ];

    await createDataLayerSource(collector);

    // Should have processed both existing events
    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0].name).toBe('dataLayer existing_event_1');
    expect(collectedEvents[1].name).toBe('dataLayer existing_event_2');
  });

  test('ignores non-object events', async () => {
    await createDataLayerSource(collector);

    // Push invalid events
    getDataLayer().push('string_event');
    getDataLayer().push(123);
    getDataLayer().push(null);
    getDataLayer().push(undefined);

    // Should not have processed any events
    expect(collectedEvents).toHaveLength(0);
  });

  test('ignores objects without event property', async () => {
    await createDataLayerSource(collector);

    // Push objects without event property
    getDataLayer().push({ data: 'test' });
    getDataLayer().push({ type: 'something' });

    // Should not have processed any events
    expect(collectedEvents).toHaveLength(0);
  });

  test('uses custom prefix', async () => {
    await createDataLayerSource(collector, { settings: { prefix: 'custom' } });

    getDataLayer().push({ event: 'test_event', data: 'test' });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].name).toBe('custom test_event');
  });

  test('uses custom dataLayer name', async () => {
    await createDataLayerSource(collector, {
      settings: { name: 'customLayer' },
    });

    // Should create customLayer instead of dataLayer
    expect(window.customLayer).toBeDefined();
    expect(Array.isArray(window.customLayer)).toBe(true);

    // Push to custom layer
    (window.customLayer as unknown[]).push({
      event: 'test_event',
      data: 'test',
    });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].name).toBe('dataLayer test_event');
  });
});
