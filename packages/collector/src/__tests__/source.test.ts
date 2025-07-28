import type { Collector } from '@walkerOS/core';
import type { WalkerOS, Source } from '@walkerOS/core';
import { createCollector } from '../collector';
import { createSource, initSources } from '../source';

// Mock source implementation
const mockSource: Source.Init<Source.Config, () => void> = async (
  collector: Collector.Instance,
  config: Source.Config,
) => {
  const mockElb = () => {
    return Promise.resolve({ ok: true });
  };

  const source: Source.Instance<Source.Config> = {
    type: 'mock',
    config,
    collector,
    destroy: jest.fn(),
  };

  return { source, elb: mockElb };
};

describe('Source', () => {
  let collector: Collector.Instance;

  beforeEach(async () => {
    const result = await createCollector();
    collector = result.collector;
  });

  describe('createSource', () => {
    it('should create a source and register it in collector', async () => {
      const config: Source.InitConfig = {
        id: 'test-source',
        settings: { test: true },
      };

      const result = await createSource(collector, mockSource, config);

      expect(result.source).toBeDefined();
      expect(result.elb).toBeDefined();
      expect(collector.sources['test-source']).toBeDefined();
      expect(collector.sources['test-source'].type).toBe('mock');
      expect(collector.sources['test-source'].settings).toEqual({ test: true });
    });

    it('should attach elb to source instance', async () => {
      const config: Source.InitConfig = {
        id: 'test-source',
        settings: {},
      };

      const result = await createSource(collector, mockSource, config);

      expect(result.source).toBeDefined();
      const sourceWithElb = result.source as Source.Instance & {
        elb?: () => void;
      };
      expect(sourceWithElb.elb).toBe(result.elb);
    });

    it('should return empty object if source is disabled', async () => {
      const config: Source.InitConfig = {
        id: 'test-source',
        disabled: true,
        settings: {},
      };

      const result = await createSource(collector, mockSource, config);

      expect(result).toEqual({});
      expect(collector.sources['test-source']).toBeUndefined();
    });

    it('should generate source id if not provided', async () => {
      const config: Source.InitConfig = {
        settings: {},
      };

      const result = await createSource(collector, mockSource, config);

      expect(result.source).toBeDefined();
      // Should have generated an ID starting with mock_
      const sourceIds = Object.keys(collector.sources);
      expect(sourceIds.some((id) => id.startsWith('mock_'))).toBe(true);
    });

    it('should handle source initialization errors', async () => {
      const errorSource: Source.Init = async () => {
        throw new Error('Source init failed');
      };

      const config: Source.InitConfig = {
        id: 'error-source',
        settings: {},
      };

      const result = await createSource(collector, errorSource, config);

      expect(result).toEqual({});
      expect(collector.sources['error-source']).toBeUndefined();
    });
  });

  describe('initSources', () => {
    it('should initialize multiple sources', async () => {
      const sources = {
        source1: {
          code: mockSource,
          config: {
            settings: { name: 'source1' },
          },
        },
        source2: {
          code: mockSource,
          config: {
            settings: { name: 'source2' },
          },
        },
      };

      await initSources(collector, sources);

      expect(collector.sources['source1']).toBeDefined();
      expect(collector.sources['source2']).toBeDefined();
      expect(collector.sources['source1'].settings).toEqual({
        name: 'source1',
      });
      expect(collector.sources['source2'].settings).toEqual({
        name: 'source2',
      });
    });

    it('should handle empty sources object', async () => {
      await initSources(collector, {});
      expect(Object.keys(collector.sources)).toHaveLength(0);
    });

    it('should skip sources that fail to initialize', async () => {
      const errorSource: Source.Init = async () => {
        throw new Error('Source init failed');
      };

      const sources = {
        goodSource: {
          code: mockSource,
          config: {
            settings: { name: 'good' },
          },
        },
        badSource: {
          code: errorSource,
          config: {
            settings: { name: 'bad' },
          },
        },
      };

      await initSources(collector, sources);

      expect(collector.sources['goodSource']).toBeDefined();
      expect(collector.sources['badSource']).toBeUndefined();
    });
  });

  describe('createCollector with sources', () => {
    it('should initialize sources during collector creation', async () => {
      const config = {
        sources: {
          test: {
            code: mockSource,
            config: {
              settings: { test: true },
            },
          },
        },
      };

      const { collector: newCollector } = await createCollector(config);

      expect(newCollector.sources['test']).toBeDefined();
      expect(newCollector.sources['test'].type).toBe('mock');
      expect(newCollector.sources['test'].elb).toBeDefined();
    });
  });
});
