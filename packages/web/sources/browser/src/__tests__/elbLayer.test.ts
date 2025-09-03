import { initElbLayer } from '../elbLayer';
import type { WalkerOS, Elb } from '@walkeros/core';

// Helper to access window.elbLayer safely
const getWindowElbLayer = (): unknown[] | undefined =>
  (window as unknown as { elbLayer?: unknown[] }).elbLayer;

const setWindowElbLayer = (value: unknown[]): void => {
  (window as unknown as { elbLayer: unknown[] }).elbLayer = value;
};

const deleteWindowElbLayer = (): void => {
  (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
};

const pushToElbLayer = (item: unknown): void => {
  const w = window as unknown as { elbLayer?: unknown[] };
  if (!w.elbLayer) w.elbLayer = [];
  w.elbLayer.push(item);
};

describe('Elb Layer', () => {
  let collectedEvents: WalkerOS.Event[];
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(async () => {
    // Clear any existing elbLayer
    deleteWindowElbLayer();
    collectedEvents = [];

    // Create mock elb function
    mockElb = jest.fn().mockImplementation((...args: unknown[]) => {
      collectedEvents.push(args[0] as WalkerOS.Event);
      return Promise.resolve({
        ok: true,
        successful: [],
        queued: [],
        failed: [],
      });
    });
  });

  afterEach(() => {
    // Clean up window properties
    deleteWindowElbLayer();
  });

  describe('Initialization', () => {
    test('creates elbLayer array on window', () => {
      expect(getWindowElbLayer()).toBeUndefined();

      initElbLayer(mockElb);

      expect(getWindowElbLayer()).toBeDefined();
      expect(Array.isArray(getWindowElbLayer())).toBe(true);
      expect(getWindowElbLayer()).toHaveLength(0);
    });

    test('uses custom layer name', () => {
      expect(
        (window as Window & { customLayer?: unknown }).customLayer,
      ).toBeUndefined();

      initElbLayer(mockElb, { name: 'customLayer' });

      expect(
        (window as Window & { customLayer?: unknown }).customLayer,
      ).toBeDefined();
      expect(
        Array.isArray(
          (window as Window & { customLayer?: unknown }).customLayer,
        ),
      ).toBe(true);
      expect(getWindowElbLayer()).toBeUndefined();
    });

    test('preserves existing elbLayer if present', () => {
      setWindowElbLayer([['existing', 'commands'] as unknown[]]);

      initElbLayer(mockElb);

      expect(getWindowElbLayer()).toBeDefined();
      expect(Array.isArray(getWindowElbLayer())).toBe(true);
      // Commands should be processed and cleared
      expect(getWindowElbLayer()).toHaveLength(0);
    });
  });

  describe('Command Processing', () => {
    test('processes existing commands on initialization', () => {
      // Pre-populate elbLayer with commands
      setWindowElbLayer([
        ['page view', { title: 'test' }] as unknown[],
        ['button click', { id: 'test' }] as unknown[],
      ]);

      initElbLayer(mockElb);

      expect(mockElb).toHaveBeenCalledTimes(2);
      expect(getWindowElbLayer()).toHaveLength(0);
    });

    test('processes walker commands first', () => {
      // Pre-populate with mixed commands
      setWindowElbLayer([
        ['regular event', { data: 'test' }] as unknown[],
        ['walker config', { verbose: true }] as unknown[],
        ['another event', { data: 'test2' }] as unknown[],
      ]);

      initElbLayer(mockElb);

      // Walker commands should be processed first, then events
      expect(mockElb).toHaveBeenCalledTimes(3);
    });

    test('handles array arguments correctly', () => {
      setWindowElbLayer([['test event', { id: 123 }] as unknown[]]);

      initElbLayer(mockElb);

      expect(mockElb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'test event',
          data: { id: 123 },
        }),
      );
    });

    test('handles object events correctly', () => {
      const eventObject = {
        event: 'custom event',
        data: { test: true },
        source: { type: 'custom', id: 'custom-id', previous_id: '' },
      };

      setWindowElbLayer([eventObject]);

      initElbLayer(mockElb);

      expect(mockElb).toHaveBeenCalledWith(eventObject);
    });
  });

  describe('Runtime Push Operations', () => {
    test('processes items pushed after initialization', () => {
      initElbLayer(mockElb);

      const elbLayer = getWindowElbLayer() as unknown[];
      elbLayer.push(['new event', { data: 'runtime' }]);

      expect(mockElb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'new event',
          data: { data: 'runtime' },
        }),
      );
    });

    test('handles runtime object events', () => {
      initElbLayer(mockElb);

      const eventObject = {
        event: 'runtime event',
        data: { runtime: true },
      };

      const elbLayer = getWindowElbLayer() as unknown[];
      elbLayer.push(eventObject);

      expect(mockElb).toHaveBeenCalledWith(eventObject);
    });

    test('handles runtime walker commands', () => {
      initElbLayer(mockElb);

      const elbLayer = getWindowElbLayer() as unknown[];
      elbLayer.push(['walker config', { verbose: true }]);

      expect(mockElb).toHaveBeenCalledWith('walker config', { verbose: true });
    });
  });

  describe('Edge Cases', () => {
    test('handles empty arrays gracefully', () => {
      setWindowElbLayer([[]]);

      expect(() => {
        initElbLayer(mockElb);
      }).not.toThrow();

      expect(mockElb).not.toHaveBeenCalled();
    });

    test('handles arrays with falsy first element', () => {
      setWindowElbLayer([
        ['', { data: 'test' }],
        [null, { data: 'test2' }],
      ]);

      expect(() => {
        initElbLayer(mockElb);
      }).not.toThrow();

      expect(mockElb).not.toHaveBeenCalled();
    });

    test('handles empty objects gracefully', () => {
      setWindowElbLayer([{}]);

      expect(() => {
        initElbLayer(mockElb);
      }).not.toThrow();

      expect(mockElb).not.toHaveBeenCalled();
    });

    test('handles invalid command formats gracefully', () => {
      setWindowElbLayer(['invalid string command', 123, null, undefined]);

      expect(() => {
        initElbLayer(mockElb);
      }).not.toThrow();
    });
  });

  describe('Configuration Options', () => {
    test('respects custom prefix configuration', () => {
      setWindowElbLayer([['test event', { data: 'custom' }] as unknown[]]);

      initElbLayer(mockElb, { prefix: 'data-custom' });

      expect(mockElb).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'test event',
          data: { data: 'custom' },
        }),
      );
    });

    test('works without window object', () => {
      const originalWindow = global.window;
      delete (global as unknown as { window?: unknown }).window;

      expect(() => {
        initElbLayer(mockElb);
      }).not.toThrow();

      global.window = originalWindow;
    });
  });
});
