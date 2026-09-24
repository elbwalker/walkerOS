import {
  MIN_HEARTBEAT_INTERVAL_S,
  resolveHeartbeatIntervalMs,
} from '../run.js';
import { createMockLogger } from './helpers/mock-logger.js';

describe('resolveHeartbeatIntervalMs', () => {
  it('defaults to 60 s when unset or blank', () => {
    const logger = createMockLogger();
    expect(resolveHeartbeatIntervalMs(undefined, logger)).toBe(60_000);
    expect(resolveHeartbeatIntervalMs('  ', logger)).toBe(60_000);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses a valid value in seconds', () => {
    expect(resolveHeartbeatIntervalMs('30', createMockLogger())).toBe(30_000);
  });

  it.each(['0', '-5', 'abc', '1', 'NaN', 'Infinity'])(
    'clamps %p to the 10 s minimum with a warning',
    (raw) => {
      const logger = createMockLogger();
      expect(resolveHeartbeatIntervalMs(raw, logger)).toBe(
        MIN_HEARTBEAT_INTERVAL_S * 1000,
      );
      expect(MIN_HEARTBEAT_INTERVAL_S).toBe(10);
      expect(logger.warn).toHaveBeenCalledTimes(1);
    },
  );
});
