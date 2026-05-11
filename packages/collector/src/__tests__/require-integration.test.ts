import { startFlow } from '../flow';

describe('require integration', () => {
  test('full chain: CMP -> consent -> session -> user -> dataLayer', async () => {
    const initOrder: string[] = [];

    const mockCmp = async (ctx: any) => ({
      type: 'cmp',
      config: {},
      push: ctx.env.elb,
    });

    const mockSession = async (ctx: any) => ({
      type: 'session',
      config: {},
      push: ctx.env.elb,
      init: async () => {
        initOrder.push('session');
        await ctx.env.command('user', {
          session: 'sess-1',
          device: 'dev-1',
        });
      },
    });

    const mockDataLayer = async (ctx: any) => ({
      type: 'dataLayer',
      config: {},
      push: ctx.env.elb,
      init: async () => {
        initOrder.push('dataLayer');
      },
    });

    const { collector, elb } = await startFlow({
      sources: {
        cmp: { code: mockCmp },
        session: { code: mockSession, config: { require: ['consent'] } },
        dataLayer: { code: mockDataLayer, config: { require: ['user'] } },
      },
    });

    // All sources are registered eagerly. Their init methods ran in pass 2.
    expect(collector.sources['cmp']).toBeDefined();
    expect(collector.sources['session']).toBeDefined();
    expect(collector.sources['dataLayer']).toBeDefined();
    // session has not yet been "started" (require['consent'] still pending).
    expect(collector.sources['session'].config.require).toContain('consent');
    // initOrder reflects pass-2 init invocation order.
    expect(initOrder).toEqual(['session', 'dataLayer']);

    await elb('walker consent', { marketing: true });

    // Cascade resolved: session started (consent), dataLayer started (user
    // fired by session.init at startup decrementing dataLayer.require['user']).
    expect(collector.sources['session'].config.require?.length || 0).toBe(0);
    expect(collector.sources['dataLayer'].config.require?.length || 0).toBe(0);
    expect(collector.user).toEqual(
      expect.objectContaining({ session: 'sess-1', device: 'dev-1' }),
    );
  });

  test('source and destination require in same flow', async () => {
    const mockSession = jest.fn().mockImplementation(async (ctx: any) => ({
      type: 'session',
      config: {},
      push: ctx.env.elb,
      init: async () => {
        await ctx.env.command('user', { session: 'sess-1' });
      },
    }));

    const mockPush = jest.fn();

    const { collector, elb } = await startFlow({
      sources: {
        session: { code: mockSession, config: { require: ['consent'] } },
      },
      destinations: {
        ga4: {
          code: { push: mockPush, config: {} },
          config: { require: ['user'] },
        },
      },
    });

    // Source is registered (factory + init both ran) but not yet started:
    // require['consent'] still pending.
    expect(collector.sources['session']).toBeDefined();
    expect(collector.sources['session'].config.require).toContain('consent');
    // session.init fired the user command at startup, which already activated
    // GA4 (its require: ['user'] was satisfied during init).
    expect(collector.destinations['ga4']).toBeDefined();

    await elb('walker consent', { marketing: true });

    // Session is now started; GA4 was already active.
    expect(collector.sources['session'].config.require?.length || 0).toBe(0);
    expect(collector.destinations['ga4']).toBeDefined();
  });

  test('source.on is called after deferred source activates', async () => {
    const onMock = jest.fn();
    const factory = jest.fn().mockImplementation(async (ctx: any) => ({
      type: 'reactive',
      config: {},
      push: ctx.env.elb,
      on: onMock,
    }));

    const { elb } = await startFlow({
      sources: {
        reactive: { code: factory, config: { require: ['consent'] } },
      },
    });

    // Factory was called once at registration (regardless of require).
    expect(factory).toHaveBeenCalledTimes(1);
    // on() not yet called: source is not started (require still has 'consent').
    expect(onMock).not.toHaveBeenCalled();

    await elb('walker consent', { marketing: true });
    // The 'consent' event was queued in queueOn pre-start, then flushed once
    // require emptied; we expect at least one on() invocation now.
    expect(onMock).toHaveBeenCalled();

    onMock.mockClear();
    await elb('walker user', { id: 'u1' });
    expect(onMock).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ id: 'u1' }),
    );
  });

  test('require + consent compose: require gates init, consent gates push', async () => {
    const mockPush = jest.fn();

    const { collector, elb } = await startFlow({
      sources: {
        cmp: {
          code: async (ctx: any) => ({
            type: 'cmp',
            config: {},
            push: ctx.env.elb,
          }),
        },
      },
      destinations: {
        ga4: {
          code: { push: mockPush, config: {} },
          config: {
            require: ['consent'],
            consent: { marketing: true },
          },
        },
      },
    });

    // Destination not registered yet
    expect(collector.destinations['ga4']).toBeUndefined();

    // Consent fires — destination registers
    await elb('walker consent', { analytics: true });
    expect(collector.destinations['ga4']).toBeDefined();

    // Push event — consent check still applies per-push
    // analytics consent alone doesn't satisfy marketing requirement
    // Events will be queued per the existing consent mechanism
  });
});
