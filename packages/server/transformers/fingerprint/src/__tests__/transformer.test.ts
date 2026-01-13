import type { Collector, Logger, Transformer, WalkerOS } from '@walkeros/core';
import { transformerFingerprint } from '../transformer';
import type { FingerprintSettings } from '../types';

describe('Transformer Fingerprint', () => {
  const mockLogger: Logger.Instance = {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn() as unknown as Logger.ThrowFn,
    scope: jest.fn().mockReturnThis(),
  };

  const mockCollector = {} as Collector.Instance;

  const createInitContext = (
    config: Transformer.Config<Transformer.Types<FingerprintSettings>>,
  ): Transformer.Context<Transformer.Types<FingerprintSettings>> => ({
    collector: mockCollector,
    config,
    env: {},
    logger: mockLogger,
    id: 'test-fingerprint',
  });

  const createPushContext = (
    ingest: unknown = {},
  ): Transformer.Context<Transformer.Types<FingerprintSettings>> => ({
    collector: mockCollector,
    config: {},
    env: {},
    logger: mockLogger,
    id: 'test-fingerprint',
    ingest,
  });

  const baseEvent: WalkerOS.DeepPartialEvent = {
    event: 'page view',
    data: { userId: 'user123' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Field Resolution', () => {
    it('should hash string fields from ingest in order', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip', 'ingest.userAgent'],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const result = await transformer.push(baseEvent, pushContext);

      expect(result).toBeDefined();
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toBeDefined();
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toHaveLength(16);
    });

    it('should hash fields in order (order matters)', async () => {
      const initContext1 = createInitContext({
        settings: {
          fields: ['ingest.ip', 'ingest.userAgent'],
          length: 16,
        },
      });

      const initContext2 = createInitContext({
        settings: {
          fields: ['ingest.userAgent', 'ingest.ip'], // reversed order
          length: 16,
        },
      });

      const transformer1 = await transformerFingerprint(initContext1);
      const transformer2 = await transformerFingerprint(initContext2);

      const pushContext = createPushContext({
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const result1 = await transformer1.push(baseEvent, pushContext);
      const result2 = await transformer2.push(baseEvent, pushContext);

      // Different order should produce different hashes
      expect((result1 as WalkerOS.DeepPartialEvent).user?.hash).not.toEqual(
        (result2 as WalkerOS.DeepPartialEvent).user?.hash,
      );
    });

    it('should resolve fields from event via dot notation', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['event.data.userId', 'ingest.ip'],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({ ip: '192.168.1.1' });

      const result = await transformer.push(baseEvent, pushContext);

      expect(result).toBeDefined();
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toBeDefined();
    });

    it('should support function fields via mapping config', async () => {
      const mockDate = 15;
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip', { fn: () => mockDate }],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({ ip: '192.168.1.1' });

      const result = await transformer.push(baseEvent, pushContext);

      expect(result).toBeDefined();
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toBeDefined();
    });

    it('should support key + fn transformation', async () => {
      const anonymizeIP = (ip: string) => ip.replace(/\.\d+$/, '.0');

      const initContext = createInitContext({
        settings: {
          fields: [{ key: 'ingest.ip', fn: anonymizeIP }],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({ ip: '192.168.1.100' });

      const result = await transformer.push(baseEvent, pushContext);

      expect(result).toBeDefined();
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toBeDefined();
    });
  });

  describe('Missing Fields', () => {
    it('should handle missing ingest fields gracefully', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip', 'ingest.missingField', 'ingest.userAgent'],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({
        ip: '192.168.1.1',
        // missingField not provided
        userAgent: 'Mozilla/5.0',
      });

      const result = await transformer.push(baseEvent, pushContext);

      // Should not throw, missing field becomes empty string
      expect(result).toBeDefined();
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toBeDefined();
    });

    it('should handle undefined ingest', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip'],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext(undefined);

      const result = await transformer.push(baseEvent, pushContext);

      expect(result).toBeDefined();
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toBeDefined();
    });

    it('should handle empty fields array', async () => {
      const initContext = createInitContext({
        settings: {
          fields: [],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({ ip: '192.168.1.1' });

      const result = await transformer.push(baseEvent, pushContext);

      // Empty fields = hash of empty string
      expect(result).toBeDefined();
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toBeDefined();
    });
  });

  describe('Output Configuration', () => {
    it('should store hash at default path user.hash', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip'],
          // output not specified, should default to 'user.hash'
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({ ip: '192.168.1.1' });

      const result = await transformer.push(baseEvent, pushContext);

      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toBeDefined();
    });

    it('should store hash at configured output path', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip'],
          output: 'user.fingerprint',
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({ ip: '192.168.1.1' });

      const result = await transformer.push(baseEvent, pushContext);

      expect(
        (result as WalkerOS.DeepPartialEvent).user?.fingerprint,
      ).toBeDefined();
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toBeUndefined();
    });

    it('should store hash at nested path', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip'],
          output: 'data.tracking.fingerprint',
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({ ip: '192.168.1.1' });

      const result = await transformer.push(baseEvent, pushContext);

      expect((result as any).data?.tracking?.fingerprint).toBeDefined();
    });
  });

  describe('Hash Length', () => {
    it('should truncate hash when length is specified', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip'],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({ ip: '192.168.1.1' });

      const result = await transformer.push(baseEvent, pushContext);

      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toHaveLength(16);
    });

    it('should return full hash when length is not specified', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip'],
          // length not specified
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({ ip: '192.168.1.1' });

      const result = await transformer.push(baseEvent, pushContext);

      // SHA-256 produces 64-char hex string
      expect((result as WalkerOS.DeepPartialEvent).user?.hash).toHaveLength(64);
    });
  });

  describe('Determinism', () => {
    it('should produce consistent hashes for same input', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip', 'ingest.userAgent'],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext = createPushContext({
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const result1 = await transformer.push({ ...baseEvent }, pushContext);
      const result2 = await transformer.push({ ...baseEvent }, pushContext);

      expect((result1 as WalkerOS.DeepPartialEvent).user?.hash).toEqual(
        (result2 as WalkerOS.DeepPartialEvent).user?.hash,
      );
    });

    it('should produce different hashes for different input', async () => {
      const initContext = createInitContext({
        settings: {
          fields: ['ingest.ip'],
          length: 16,
        },
      });

      const transformer = await transformerFingerprint(initContext);

      const pushContext1 = createPushContext({ ip: '192.168.1.1' });
      const pushContext2 = createPushContext({ ip: '192.168.1.2' });

      const result1 = await transformer.push({ ...baseEvent }, pushContext1);
      const result2 = await transformer.push({ ...baseEvent }, pushContext2);

      expect((result1 as WalkerOS.DeepPartialEvent).user?.hash).not.toEqual(
        (result2 as WalkerOS.DeepPartialEvent).user?.hash,
      );
    });
  });
});
