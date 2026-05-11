import { startFlow } from '../flow';

describe('source require gating', () => {
  describe('sources', () => {
    test('source with require sits unstarted, on() fires after require empties', async () => {
      const onMock = jest.fn();
      const factory = jest.fn().mockImplementation(async (ctx: any) => ({
        type: 'deferred',
        config: {},
        push: ctx.env.elb,
        on: onMock,
      }));

      const { collector, elb } = await startFlow({
        sources: {
          deferred: {
            code: factory,
            config: { require: ['consent'] },
          },
        },
      });

      // Factory runs eagerly at registration regardless of require.
      expect(factory).toHaveBeenCalledTimes(1);
      expect(collector.sources['deferred']).toBeDefined();
      // Source is registered but not yet started: require still has 'consent'.
      expect(collector.sources['deferred'].config.require).toContain('consent');
      // on() is not invoked while require is unmet.
      expect(onMock).not.toHaveBeenCalled();

      await elb('walker consent', { marketing: true });

      // Require has been decremented; queued on('consent') has been replayed.
      expect(collector.sources['deferred'].config.require?.length || 0).toBe(0);
      expect(onMock).toHaveBeenCalledWith(
        'consent',
        expect.objectContaining({ marketing: true }),
      );
    });

    test('multiple require — all must be met before on() fires', async () => {
      const onMock = jest.fn();
      const factory = jest.fn().mockImplementation(async (ctx: any) => ({
        type: 'multi',
        config: {},
        push: ctx.env.elb,
        on: onMock,
      }));

      const { collector, elb } = await startFlow({
        sources: {
          multi: {
            code: factory,
            config: { require: ['consent', 'run'] },
          },
        },
        run: false,
      });

      await elb('walker consent', { marketing: true });

      // Consent fired, but run still required → on() still queued.
      expect(collector.sources['multi'].config.require).toEqual(['run']);
      expect(onMock).not.toHaveBeenCalled();

      await elb('walker run');

      // All require fulfilled — queueOn flushed.
      expect(collector.sources['multi'].config.require?.length || 0).toBe(0);
      expect(onMock).toHaveBeenCalled();
    });

    test('unfired condition keeps source unstarted', async () => {
      const onMock = jest.fn();
      const factory = jest.fn().mockImplementation(async (ctx: any) => ({
        type: 'stuck',
        config: {},
        push: ctx.env.elb,
        on: onMock,
      }));

      const { collector, elb } = await startFlow({
        sources: {
          stuck: {
            code: factory,
            config: { require: ['session'] },
          },
        },
      });

      await elb('walker consent', { marketing: true });
      await elb('walker user', { id: 'u1' });

      // No 'session' fired → require not emptied → on() never delivered.
      expect(collector.sources['stuck']).toBeDefined();
      expect(collector.sources['stuck'].config.require).toContain('session');
      expect(onMock).not.toHaveBeenCalled();
    });

    test('chained cascade: consent -> session -> user -> dataLayer', async () => {
      const initOrder: string[] = [];

      const mockSession = jest.fn().mockImplementation(async (ctx: any) => ({
        type: 'session',
        config: {},
        push: ctx.env.elb,
        init: async () => {
          initOrder.push('session');
          await ctx.env.command('user', { session: 'sess-1' });
        },
      }));

      const mockDataLayer = jest.fn().mockImplementation(async (ctx: any) => ({
        type: 'dataLayer',
        config: {},
        push: ctx.env.elb,
        init: async () => {
          initOrder.push('dataLayer');
        },
      }));

      const { collector, elb } = await startFlow({
        sources: {
          session: { code: mockSession, config: { require: ['consent'] } },
          dataLayer: { code: mockDataLayer, config: { require: ['user'] } },
        },
      });

      // Both factories ran during registration; their `init` methods ran in
      // pass 2 of initSources (eagerly, regardless of require). What changed
      // since the old shape is *when* the side effects fire — they happen
      // up-front now, and the cascade we verify is the user-state flow that
      // depends on session.init's command('user', ...) call.
      expect(initOrder).toEqual(['session', 'dataLayer']);

      await elb('walker consent', { marketing: true });

      // Both sources started after consent -> user cascade.
      expect(collector.sources['session']).toBeDefined();
      expect(collector.sources['session'].config.require?.length || 0).toBe(0);
      expect(collector.sources['dataLayer']).toBeDefined();
      expect(collector.sources['dataLayer'].config.require?.length || 0).toBe(
        0,
      );
      // session.init fired user command; user state propagated.
      expect(collector.user).toEqual(
        expect.objectContaining({ session: 'sess-1' }),
      );
    });

    test('re-entrancy does not double-run init', async () => {
      let initCount = 0;

      const sourceA = jest.fn().mockImplementation(async (ctx: any) => ({
        type: 'A',
        config: {},
        push: ctx.env.elb,
        init: async () => {
          initCount++;
          await ctx.env.command('consent', { analytics: true });
        },
      }));

      const { elb } = await startFlow({
        sources: {
          a: { code: sourceA, config: { require: ['consent'] } },
        },
      });

      await elb('walker consent', { marketing: true });

      // init only runs once (in pass 2 of initSources).
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
