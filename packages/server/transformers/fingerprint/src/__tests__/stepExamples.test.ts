import type { Transformer, WalkerOS } from '@walkeros/core';
import {
  createIngest,
  createMockContext,
  createMockLogger,
  getByPath,
} from '@walkeros/core';
import { transformerFingerprint } from '../transformer';
import type { FingerprintSettings } from '../types';
import { examples } from '../dev';

type FpTypes = Transformer.Types<FingerprintSettings>;

describe('Step Examples', () => {
  const mockLogger = createMockLogger();

  const createInitContext = (config: Transformer.Config<FpTypes>) =>
    createMockContext<FpTypes>({
      config,
      logger: mockLogger,
      id: 'test-fingerprint',
    });

  const createPushContext = (ingestData: Record<string, unknown> = {}) =>
    createMockContext<FpTypes>({
      logger: mockLogger,
      id: 'test-fingerprint',
      ingest: { ...createIngest('test'), ...ingestData },
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
          settings: { salt: 'test-salt', length: 16 },
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
      expect(getByPath(result, 'event.user.hash')).toBeDefined();
      expect(typeof getByPath(result, 'event.user.hash')).toBe('string');
      expect(getByPath(result, 'event.user.hash')).toHaveLength(16);
      // Verify event data is preserved
      expect(getByPath(result, 'event.name')).toBe(event.name);
      expect(getByPath(result, 'event.data')).toEqual(event.data);
    });
  });

  describe('missingIngest', () => {
    it('fails with missing-input when ingest is empty', async () => {
      const example = examples.step.missingIngest;
      const event = example.in as WalkerOS.DeepPartialEvent;

      const transformer = await transformerFingerprint(
        createInitContext({
          settings: { salt: 'test-salt', length: 16 },
        }),
      );

      // No ip and no user agent: every visitor would share one hash.
      await expect(
        transformer.push(event, createPushContext({})),
      ).rejects.toMatchObject({ code: 'missing-input' });
    });
  });

  describe('ipAnonymization', () => {
    it('should produce the same hash for IPs in the same /24 subnet', async () => {
      const example = examples.step.ipAnonymization;
      const event = example.in as WalkerOS.DeepPartialEvent;

      const transformer = await transformerFingerprint(
        createInitContext({ settings: { salt: 'test-salt', length: 16 } }),
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

      const hash1 = getByPath(result1, 'event.user.hash');
      const hash2 = getByPath(result2, 'event.user.hash');

      // Same /24 → same anonymized IP → same hash
      expect(hash1).toBe(hash2);

      // Different subnet should differ
      const result3 = await transformer.push(
        { ...event },
        createPushContext({ ip: '10.0.43.100', userAgent: ua }),
      );
      const hash3 = getByPath(result3, 'event.user.hash');

      expect(hash1).not.toBe(hash3);
    });
  });
});
