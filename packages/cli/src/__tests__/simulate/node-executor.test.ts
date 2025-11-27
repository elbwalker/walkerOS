/**
 * Unit tests for Node.js executor
 */

import { CallTracker } from '../../commands/simulate/tracker';

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
      const { executeInNode } = await import(
        '../../commands/simulate/node-executor'
      );
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
