import type { Collector, Logger, Transformer, WalkerOS } from '@walkeros/core';
import { transformerFingerprint } from '../transformer';
import type { FingerprintSettings } from '../types';
import { examples } from '../dev';

type FpTypes = Transformer.Types<FingerprintSettings>;

describe('Step Examples', () => {
  const mockLogger: Logger.Instance = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn() as unknown as Logger.ThrowFn,
    json: jest.fn(),
    scope: jest.fn().mockReturnThis(),
  };

  const mockCollector = {} as Collector.Instance;

  const createInitContext = (
    config: Transformer.Config<FpTypes>,
  ): Transformer.Context<FpTypes> => ({
    collector: mockCollector,
    config,
    env: {},
    logger: mockLogger,
    id: 'test-fingerprint',
  });

  const createPushContext = (
    ingest: unknown = {},
  ): Transformer.Context<FpTypes> => ({
    collector: mockCollector,
    config: {},
    env: {},
    logger: mockLogger,
    id: 'test-fingerprint',
    ingest,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('serverFingerprint', () => {
    it('should produce the documented hash from ip + userAgent', async () => {
      const example = examples.step.serverFingerprint;
      const event = example.in as WalkerOS.DeepPartialEvent;

      const transformer = await transformerFingerprint(
        createInitContext({
          settings: {
            fields: ['ingest.ip', 'ingest.userAgent'],
            length: 16,
          },
        }),
      );

      const result = await transformer.push(
        event,
        createPushContext({
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (compatible; walkerOS/3.0)',
        }),
      );

      expect(result).toBeDefined();
      const outEvent = (result as { event: WalkerOS.DeepPartialEvent }).event;
      expect(outEvent.user?.hash).toBeDefined();
      expect(typeof outEvent.user?.hash).toBe('string');
      expect((outEvent.user?.hash as string).length).toBe(16);
      // Verify event data is preserved
      expect(outEvent.name).toBe(event.name);
      expect(outEvent.data).toEqual(event.data);
    });
  });

  describe('missingFields', () => {
    it('should still produce a hash when ingest is empty', async () => {
      const example = examples.step.missingFields;
      const event = example.in as WalkerOS.DeepPartialEvent;

      const transformer = await transformerFingerprint(
        createInitContext({
          settings: {
            fields: ['ingest.ip', 'ingest.userAgent'],
            length: 16,
          },
        }),
      );

      // No ingest fields provided — missing fields resolve to empty strings
      const result = await transformer.push(event, createPushContext({}));

      expect(result).toBeDefined();
      const outEvent = (result as { event: WalkerOS.DeepPartialEvent }).event;
      expect(outEvent.user?.hash).toBeDefined();
      expect(typeof outEvent.user?.hash).toBe('string');
      expect((outEvent.user?.hash as string).length).toBe(16);
      expect(outEvent.name).toBe(event.name);
    });
  });

  describe('ipAnonymization', () => {
    it('should produce the same hash for IPs in the same /24 subnet', async () => {
      const example = examples.step.ipAnonymization;
      const event = example.in as WalkerOS.DeepPartialEvent;

      // fn receives the full source object { event, ingest }
      const anonymizeIP = (source: unknown) => {
        const ip = String(
          (source as { ingest?: { ip?: string } }).ingest?.ip ?? '',
        );
        return ip.replace(/\.\d+$/, '.0');
      };

      const transformer = await transformerFingerprint(
        createInitContext({
          settings: {
            fields: [{ fn: anonymizeIP }, 'ingest.userAgent'],
            length: 16,
          },
        }),
      );

      const ua = 'Mozilla/5.0 (compatible; walkerOS/3.0)';

      // Two IPs in the same /24 subnet
      const result1 = await transformer.push(
        { ...event },
        createPushContext({ ip: '10.0.42.100', userAgent: ua }),
      );
      const result2 = await transformer.push(
        { ...event },
        createPushContext({ ip: '10.0.42.200', userAgent: ua }),
      );

      const hash1 = (result1 as { event: WalkerOS.DeepPartialEvent }).event.user
        ?.hash;
      const hash2 = (result2 as { event: WalkerOS.DeepPartialEvent }).event.user
        ?.hash;

      // Same /24 → same anonymized IP → same hash
      expect(hash1).toBe(hash2);

      // Different subnet should differ
      const result3 = await transformer.push(
        { ...event },
        createPushContext({ ip: '10.0.43.100', userAgent: ua }),
      );
      const hash3 = (result3 as { event: WalkerOS.DeepPartialEvent }).event.user
        ?.hash;

      expect(hash1).not.toBe(hash3);
    });
  });
});
