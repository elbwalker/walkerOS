import { sourceDataLayer } from '../index';
import type { WalkerOS, Elb } from '@walkeros/core';
import { createMockPush, getDataLayer } from './test-utils';

describe('DataLayer Source - Minimal', () => {
  let collectedEvents: WalkerOS.Event[];
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(async () => {
    // Clear any existing dataLayer
    delete window.dataLayer;
    collectedEvents = [];

    // Create a simple synchronous mock
    mockElb = createMockPush(collectedEvents);
  });

  test('source initializes without errors', async () => {
    const source = await sourceDataLayer(
      { settings: {} },
      { elb: mockElb, window },
    );
    expect(source.type).toBe('dataLayer');
    expect(source.config).toBeDefined();
  });

  test('creates dataLayer if it does not exist', async () => {
    expect(window.dataLayer).toBeUndefined();

    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    expect(window.dataLayer).toBeDefined();
    expect(Array.isArray(window.dataLayer)).toBe(true);
  });

  test('processes simple dataLayer event', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Push a simple event
    getDataLayer().push({ event: 'test_event', test: 'data' });

    // Should have captured the event immediately (synchronous)
    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer test_event',
      data: expect.objectContaining({
        event: 'test_event',
        test: 'data',
      }),
    });
  });

  test('processes gtag event format', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Push a gtag-style event
    getDataLayer().push([
      'event',
      'purchase',
      { value: 25.42, currency: 'USD' },
    ]);

    // Should transform to proper format
    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer purchase',
      data: expect.objectContaining({
        event: 'purchase',
        value: 25.42,
        currency: 'USD',
      }),
    });
  });

  test('handles empty dataLayer gracefully', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // No events pushed - should not crash
    expect(collectedEvents).toHaveLength(0);
    expect(getDataLayer()).toHaveLength(0);
  });

  test('processes existing events on initialization', async () => {
    // Setup dataLayer with existing events
    window.dataLayer = [{ event: 'existing_event', value: 'test' }];

    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Should process existing events
    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer existing_event',
      data: expect.objectContaining({
        event: 'existing_event',
        value: 'test',
      }),
    });
  });

  test('uses custom prefix', async () => {
    await sourceDataLayer(
      { settings: { prefix: 'gtag' } },
      { elb: mockElb, window },
    );

    getDataLayer().push({ event: 'custom_event' });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'gtag custom_event',
    });
  });

  test('uses custom dataLayer name', async () => {
    await sourceDataLayer(
      { settings: { name: 'customDataLayer' } },
      { elb: mockElb, window },
    );

    expect(window.customDataLayer).toBeDefined();
    expect(Array.isArray(window.customDataLayer)).toBe(true);
  });
});
