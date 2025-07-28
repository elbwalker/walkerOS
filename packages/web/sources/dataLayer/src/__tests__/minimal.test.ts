import { createCollector } from '@walkerOS/collector';
import { sourceDataLayer } from '../index';
import type { WalkerOS } from '@walkerOS/core';
import { createMockPush, getDataLayer } from './test-utils';

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
    ({ collector } = await createCollector({
      tagging: 2,
    }));

    // Override push with synchronous mock
    collector.push = mockPush;
  });

  test('source initializes without errors', () => {
    const source = sourceDataLayer();
    expect(source.type).toBe('dataLayer');
    expect(source.init).toBeDefined();

    // Should not throw
    expect(() => {
      if (source.init) {
        source.init(collector, { settings: source.settings ?? {} });
      }
    }).not.toThrow();
  });

  test('creates dataLayer if it does not exist', () => {
    expect(window.dataLayer).toBeUndefined();

    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    expect(window.dataLayer).toBeDefined();
    expect(Array.isArray(window.dataLayer)).toBe(true);
  });

  test('processes simple dataLayer event', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Push a simple event
    getDataLayer().push({ event: 'test_event', test: 'data' });

    // Should have captured the event immediately (synchronous)
    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer test_event',
      data: { event: 'test_event', test: 'data' },
      source: { type: 'dataLayer' },
    });
  });

  test('processes existing events on initialization', () => {
    // Pre-populate dataLayer
    window.dataLayer = [
      { event: 'existing_event_1', data: 'test1' },
      { event: 'existing_event_2', data: 'test2' },
    ];

    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Should have processed both existing events
    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0].event).toBe('dataLayer existing_event_1');
    expect(collectedEvents[1].event).toBe('dataLayer existing_event_2');
  });

  test('ignores non-object events', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Push invalid events
    getDataLayer().push('string_event');
    getDataLayer().push(123);
    getDataLayer().push(null);
    getDataLayer().push(undefined);

    // Should not have processed any events
    expect(collectedEvents).toHaveLength(0);
  });

  test('ignores objects without event property', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Push objects without event property
    getDataLayer().push({ data: 'test' });
    getDataLayer().push({ type: 'something' });

    // Should not have processed any events
    expect(collectedEvents).toHaveLength(0);
  });

  test('uses custom prefix', () => {
    const source = sourceDataLayer({ prefix: 'custom' });
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    getDataLayer().push({ event: 'test_event', data: 'test' });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].event).toBe('custom test_event');
  });

  test('uses custom dataLayer name', () => {
    const source = sourceDataLayer({ name: 'customLayer' });
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Should create customLayer instead of dataLayer
    expect(window.customLayer).toBeDefined();
    expect(Array.isArray(window.customLayer)).toBe(true);

    // Push to custom layer
    (window.customLayer as unknown[]).push({
      event: 'test_event',
      data: 'test',
    });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].event).toBe('dataLayer test_event');
  });
});
