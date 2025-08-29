import type { WalkerOS, Destination } from '@walkeros/core';
import { dataLayerDestination } from '../destination';
import { mockDataLayer } from './setup';

describe('Destination Tests', () => {
  beforeEach(() => {});

  describe('Initialization', () => {
    test('should create destination', () => {
      const destination = dataLayerDestination();

      expect(destination).toMatchObject({
        type: 'dataLayer',
        config: {},
        push: expect.any(Function),
        pushBatch: expect.any(Function),
      });
    });

    test('should push event to dataLayer', () => {
      const destination = dataLayerDestination();
      const event = {
        event: 'foo bar',
      } as unknown as WalkerOS.Event;
      destination.push(event, {} as unknown as Destination.PushContext);
      expect(mockDataLayer).toHaveBeenCalledWith(event);
    });

    test('should not push events from dataLayer source', () => {
      const destination = dataLayerDestination();
      const event = {
        event: 'foo bar',
        source: {
          type: 'dataLayer',
        },
      } as unknown as WalkerOS.Event;
      destination.push(event, {} as unknown as Destination.PushContext);
      expect(mockDataLayer).not.toHaveBeenCalled();
    });

    test('should push context data when available', () => {
      const destination = dataLayerDestination();
      const event = {
        event: 'foo bar',
      } as unknown as WalkerOS.Event;
      const contextData = { custom: 'data' };
      destination.push(event, {
        data: contextData,
      } as unknown as Destination.PushContext);
      expect(mockDataLayer).toHaveBeenCalledWith(contextData);
    });
  });

  describe('Batch Processing', () => {
    test('should push batch with events array', () => {
      const destination = dataLayerDestination();
      const batch = {
        key: 'test-batch',
        data: [{ event: 'event1' }, { event: 'event2' }],
        events: [],
      } as unknown as Destination.Batch<unknown>;

      destination.pushBatch?.(batch, {} as unknown as Destination.PushContext);

      expect(mockDataLayer).toHaveBeenCalledWith({
        event: 'batch',
        batched_event: 'test-batch',
        events: [{ event: 'event1' }, { event: 'event2' }],
      });
    });

    test('should push batch with events fallback when data is empty', () => {
      const destination = dataLayerDestination();
      const batch = {
        key: 'test-batch',
        data: [],
        events: [{ event: 'fallback1' }, { event: 'fallback2' }],
      } as unknown as Destination.Batch<unknown>;

      destination.pushBatch?.(batch, {} as unknown as Destination.PushContext);

      expect(mockDataLayer).toHaveBeenCalledWith({
        event: 'batch',
        batched_event: 'test-batch',
        events: [{ event: 'fallback1' }, { event: 'fallback2' }],
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle non-object events', () => {
      const destination = dataLayerDestination();
      const event = 'string event' as unknown as WalkerOS.Event;
      destination.push(event, {} as unknown as Destination.PushContext);
      expect(mockDataLayer).toHaveBeenCalledWith(event);
    });

    test('should handle events with non-object source', () => {
      const destination = dataLayerDestination();
      const event = {
        event: 'foo bar',
        source: 'string source',
      } as unknown as WalkerOS.Event;
      destination.push(event, {} as unknown as Destination.PushContext);
      expect(mockDataLayer).toHaveBeenCalledWith(event);
    });

    test('should handle events with dataLayer-like source type', () => {
      const destination = dataLayerDestination();
      const event = {
        event: 'foo bar',
        source: {
          type: 'custom-dataLayer-source',
        },
      } as unknown as WalkerOS.Event;
      destination.push(event, {} as unknown as Destination.PushContext);
      expect(mockDataLayer).not.toHaveBeenCalled();
    });
  });
});
