import { startFlow } from '../flow';

describe('activatePending', () => {
  describe('sources', () => {
    test('pending source inits when require condition fires', async () => {
      const mockInit = jest.fn().mockResolvedValue({
        type: 'deferred',
        config: {},
        push: jest.fn(),
      });

      const { collector, elb } = await startFlow({
        sources: {
          deferred: {
            code: mockInit,
            config: { require: ['consent'] },
          },
        },
      });

      expect(mockInit).not.toHaveBeenCalled();

      await elb('walker consent', { marketing: true });

      expect(mockInit).toHaveBeenCalledTimes(1);
      expect(collector.sources['deferred']).toBeDefined();
      expect(Object.keys(collector.pending.sources)).toHaveLength(0);
    });

    test('multiple require — all must be met', async () => {
      const mockInit = jest.fn().mockResolvedValue({
        type: 'multi',
        config: {},
        push: jest.fn(),
      });

      const { collector, elb } = await startFlow({
        sources: {
          multi: {
            code: mockInit,
            config: { require: ['consent', 'run'] },
          },
        },
        run: false,
      });

      await elb('walker consent', { marketing: true });
      expect(mockInit).not.toHaveBeenCalled();

      await elb('walker run');
      expect(mockInit).toHaveBeenCalledTimes(1);
      expect(Object.keys(collector.pending.sources)).toHaveLength(0);
    });

    test('unfired condition keeps source pending', async () => {
      const mockInit = jest.fn().mockResolvedValue({
        type: 'stuck',
        config: {},
        push: jest.fn(),
      });

      const { collector, elb } = await startFlow({
        sources: {
          stuck: {
            code: mockInit,
            config: { require: ['session'] },
          },
        },
      });

      await elb('walker consent', { marketing: true });
      await elb('walker user', { id: 'u1' });

      expect(mockInit).not.toHaveBeenCalled();
      expect(Object.keys(collector.pending.sources)).toHaveLength(1);
    });

    test('chained cascade: consent -> session -> user -> dataLayer', async () => {
      const initOrder: string[] = [];

      const mockSession = jest.fn().mockImplementation(async (ctx: any) => {
        initOrder.push('session');
        await ctx.env.command('user', { session: 'sess-1' });
        return { type: 'session', config: {}, push: jest.fn() };
      });

      const mockDataLayer = jest.fn().mockImplementation(async () => {
        initOrder.push('dataLayer');
        return { type: 'dataLayer', config: {}, push: jest.fn() };
      });

      const { collector, elb } = await startFlow({
        sources: {
          session: { code: mockSession, config: { require: ['consent'] } },
          dataLayer: { code: mockDataLayer, config: { require: ['user'] } },
        },
      });

      expect(initOrder).toEqual([]);

      await elb('walker consent', { marketing: true });

      expect(initOrder).toEqual(['session', 'dataLayer']);
      expect(collector.sources['session']).toBeDefined();
      expect(collector.sources['dataLayer']).toBeDefined();
      expect(collector.user).toEqual(
        expect.objectContaining({ session: 'sess-1' }),
      );
      expect(Object.keys(collector.pending.sources)).toHaveLength(0);
    });

    test('re-entrancy does not double-init', async () => {
      let initCount = 0;

      const sourceA = jest.fn().mockImplementation(async (ctx: any) => {
        initCount++;
        await ctx.env.command('consent', { analytics: true });
        return { type: 'A', config: {}, push: jest.fn() };
      });

      const { elb } = await startFlow({
        sources: {
          a: { code: sourceA, config: { require: ['consent'] } },
        },
      });

      await elb('walker consent', { marketing: true });

      expect(initCount).toBe(1);
    });
  });

  describe('destinations', () => {
    test('destination with require is deferred', async () => {
      const mockPush = jest.fn();

      const { collector } = await startFlow({
        destinations: {
          ga4: {
            code: { push: mockPush, config: {} },
            config: { require: ['consent'] },
          },
        },
      });

      expect(collector.destinations['ga4']).toBeUndefined();
      expect(collector.pending.destinations['ga4']).toBeDefined();
    });

    test('destination without require registers immediately', async () => {
      const mockPush = jest.fn();

      const { collector } = await startFlow({
        destinations: {
          ga4: {
            code: { push: mockPush, config: {} },
          },
        },
      });

      expect(collector.destinations['ga4']).toBeDefined();
      expect(Object.keys(collector.pending.destinations)).toHaveLength(0);
    });

    test('destination inits when require condition fires', async () => {
      const mockPush = jest.fn();

      const { collector, elb } = await startFlow({
        destinations: {
          ga4: {
            code: { push: mockPush, config: {} },
            config: { require: ['consent'] },
          },
        },
      });

      expect(collector.destinations['ga4']).toBeUndefined();

      await elb('walker consent', { marketing: true });

      expect(collector.destinations['ga4']).toBeDefined();
      expect(Object.keys(collector.pending.destinations)).toHaveLength(0);
    });

    test('destination receives queued events on activation', async () => {
      const mockPush = jest.fn();

      const { collector, elb } = await startFlow({
        destinations: {
          ga4: {
            code: { push: mockPush, config: {} },
            config: { require: ['consent'] },
          },
        },
      });

      // Push events before destination activates
      await elb('page view', { title: 'Home' });

      await elb('walker consent', { marketing: true });

      expect(collector.destinations['ga4']).toBeDefined();
      // Queued events are flushed via pushToDestinations after consent
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'page view' }),
        expect.anything(),
      );
    });

    test('destination multiple require — all must be met', async () => {
      const mockPush = jest.fn();

      const { collector, elb } = await startFlow({
        destinations: {
          ga4: {
            code: { push: mockPush, config: {} },
            config: { require: ['consent', 'user'] },
          },
        },
      });

      await elb('walker consent', { marketing: true });
      expect(collector.destinations['ga4']).toBeUndefined();

      await elb('walker user', { id: 'u1' });
      expect(collector.destinations['ga4']).toBeDefined();
    });
  });
});
