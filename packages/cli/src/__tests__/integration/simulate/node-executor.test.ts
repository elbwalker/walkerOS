/**
 * Unit tests for Node.js executor
 */

import { CallTracker } from '../../../commands/simulate/tracker';
import { executeInNode } from '../../../commands/simulate/node-executor';

describe('node-executor', () => {
  describe('call tracking', () => {
    it('should track API calls through wrapped env functions', () => {
      const tracker = new CallTracker();
      const mockFn = tracker.wrapFunction('test:api', () => 'result');
      mockFn('arg1', 'arg2');

      const calls = tracker.getCalls();
      expect(calls['test']).toHaveLength(1);
      expect(calls['test'][0].path).toBe('api');
      expect(calls['test'][0].args).toEqual(['arg1', 'arg2']);
    });
  });

  describe('executeInNode', () => {
    it('should throw error for non-existent bundle', async () => {
      const tracker = new CallTracker();

      await expect(
        executeInNode(
          '/tmp/nonexistent.mjs',
          {},
          { name: 'test' },
          tracker,
          {},
        ),
      ).rejects.toThrow();
    });
  });
});
