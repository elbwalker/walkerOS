import { startFlow } from '../flow';
import { reconcilePending } from '../pending';

describe('reconcilePending (level-based activation)', () => {
  test('destination: activates from current state set directly (no broadcast)', async () => {
    const mockPush = jest.fn();
    const { collector } = await startFlow({
      run: false,
      destinations: {
        ga4: {
          code: { push: mockPush, config: {} },
          config: { require: ['consent'] },
        },
      },
    });

    // Pending until require is satisfied.
    expect(collector.destinations['ga4']).toBeUndefined();
    expect(collector.pending.destinations['ga4']).toBeDefined();

    // Set the cell directly — NO command/broadcast fires, so the only path that
    // can activate is the level-based reconcile.
    collector.consent = { marketing: false };
    await reconcilePending(collector);

    expect(collector.destinations['ga4']).toBeDefined();
    expect(collector.pending.destinations['ga4']).toBeUndefined();
  });

  test('source: starts from current state set directly (no broadcast)', async () => {
    const onMock = jest.fn();
    const { collector } = await startFlow({
      run: false,
      sources: {
        dep: {
          code: async (ctx: any) => ({
            type: 'dep',
            config: {},
            push: ctx.env.elb,
            on: onMock,
          }),
          config: { require: ['consent'] },
        },
      },
    });

    expect(collector.sources['dep'].config.require).toEqual(['consent']);

    collector.consent = { marketing: false };
    await reconcilePending(collector);

    expect(collector.sources['dep'].config.require?.length || 0).toBe(0);
  });

  test('conjunction: partial state does not activate', async () => {
    const mockPush = jest.fn();
    const { collector } = await startFlow({
      run: false,
      destinations: {
        ga4: {
          code: { push: mockPush, config: {} },
          config: { require: ['consent', 'user'] },
        },
      },
    });

    collector.consent = { marketing: false };
    await reconcilePending(collector);

    // consent removed but user still pending → not activated.
    expect(collector.destinations['ga4']).toBeUndefined();
    expect(collector.pending.destinations['ga4'].config?.require).toEqual([
      'user',
    ]);

    collector.user = { id: 'u1' };
    await reconcilePending(collector);
    expect(collector.destinations['ga4']).toBeDefined();
  });

  test('idempotent: calling reconcile twice does not double-activate', async () => {
    const onMock = jest.fn();
    const mockPush = jest.fn();
    const { collector } = await startFlow({
      run: false,
      sources: {
        dep: {
          code: async (ctx: any) => ({
            type: 'dep',
            config: {},
            push: ctx.env.elb,
            on: onMock,
          }),
          config: { require: ['globals'] },
        },
      },
      destinations: {
        ga4: {
          code: { push: mockPush, config: {} },
          config: { require: ['globals'] },
        },
      },
    });

    collector.globals = { lang: 'en' };
    await reconcilePending(collector);
    const firstInstance = collector.destinations['ga4'];
    expect(firstInstance).toBeDefined();

    await reconcilePending(collector);
    // Same instance object — not re-registered.
    expect(collector.destinations['ga4']).toBe(firstInstance);
    expect(collector.sources['dep'].config.require?.length || 0).toBe(0);
  });

  test('additive: arbitrary require is NOT level-satisfied until seen', async () => {
    const onMock = jest.fn();
    const { collector } = await startFlow({
      run: false,
      sources: {
        dep: {
          code: async (ctx: any) => ({
            type: 'dep',
            config: {},
            push: ctx.env.elb,
            on: onMock,
          }),
          config: { require: ['my custom event'] },
        },
      },
    });

    // No backing cell and not broadcast yet → reconcile leaves it pending.
    await reconcilePending(collector);
    expect(collector.sources['dep'].config.require).toEqual([
      'my custom event',
    ]);

    // Once recorded as seen (as a broadcast would), reconcile activates it.
    collector.seenEvents.add('my custom event');
    await reconcilePending(collector);
    expect(collector.sources['dep'].config.require?.length || 0).toBe(0);
  });
});

describe('reconcile triggers (the order-independence bug fix)', () => {
  // A provider whose FACTORY (Pass 1 of initSources) emits consent. At that
  // point collector.sources is not yet merged, so the broadcast can never reach
  // a later-declared dependent. Only the registration-time reconcile (after the
  // Pass-2 loop) recovers it from the now-present consent cell.
  const provider = {
    code: async (ctx: any) => {
      await ctx.env.command('consent', { functional: true });
      return { type: 'cmp', config: {}, push: ctx.env.elb };
    },
  };

  function dependent(onMock: jest.Mock) {
    return {
      code: async (ctx: any) => ({
        type: 'dependent',
        config: {},
        push: ctx.env.elb,
        on: onMock,
      }),
      config: { require: ['consent'] },
    };
  }

  test('I5: provider declared BEFORE dependent → dependent activates', async () => {
    const onMock = jest.fn();
    const { collector } = await startFlow({
      run: false,
      sources: { provider, dependent: dependent(onMock) },
    });

    expect(collector.consent).toEqual({ functional: true });
    expect(collector.sources['dependent'].config.require?.length || 0).toBe(0);
  });

  test('I5: dependent declared BEFORE provider → dependent activates', async () => {
    const onMock = jest.fn();
    const { collector } = await startFlow({
      run: false,
      sources: { dependent: dependent(onMock), provider },
    });

    expect(collector.consent).toEqual({ functional: true });
    expect(collector.sources['dependent'].config.require?.length || 0).toBe(0);
  });

  test('I4: run-barrier — consent provided via run state activates a parked source and delivers its owed consent', async () => {
    const onMock = jest.fn();
    const { collector } = await startFlow({
      run: false,
      sources: {
        dep: {
          code: async (ctx: any) => ({
            type: 'dep',
            config: {},
            push: ctx.env.elb,
            on: onMock,
          }),
          config: { require: ['consent'] },
        },
      },
    });

    // No consent yet → still parked after registration reconcile.
    expect(collector.sources['dep'].config.require).toEqual(['consent']);
    expect(onMock).not.toHaveBeenCalled();

    await collector.command('run', { consent: { marketing: true } });

    // Activated at the run barrier AND its owed consent delivered (reconcile
    // before redeliver, so the now-started source receives the merged consent).
    expect(collector.sources['dep'].config.require?.length || 0).toBe(0);
    expect(onMock).toHaveBeenCalledWith(
      'consent',
      expect.objectContaining({ marketing: true }),
    );
  });

  test('I6: pending destination — consent provided via run state activates it', async () => {
    const mockPush = jest.fn();
    const { collector } = await startFlow({
      run: false,
      destinations: {
        ga4: {
          code: { push: mockPush, config: {} },
          config: { require: ['consent'] },
        },
      },
    });

    expect(collector.destinations['ga4']).toBeUndefined();

    await collector.command('run', { consent: { marketing: true } });

    expect(collector.destinations['ga4']).toBeDefined();
  });
});

describe('Task 4: startup direct-assign + addDestination require hole', () => {
  test('runtime command(destination) with unmet require is deferred to pending, not registered', async () => {
    const mockPush = jest.fn();
    const { collector } = await startFlow({ run: false });

    await collector.command('destination', {
      code: { push: mockPush, config: {} },
      config: { id: 'late', require: ['consent'] },
    });

    // The hole: addDestination used to register + push regardless of require.
    expect(collector.destinations['late']).toBeUndefined();
    expect(collector.pending.destinations['late']).toBeDefined();

    // Once consent fires, reconcile activates it.
    await collector.command('consent', { marketing: true });
    expect(collector.destinations['late']).toBeDefined();
  });

  test('runtime command(destination) with require already satisfied activates immediately', async () => {
    const mockPush = jest.fn();
    const { collector } = await startFlow({
      run: false,
      consent: { marketing: true },
    });

    await collector.command('destination', {
      code: { push: mockPush, config: {} },
      config: { id: 'eager', require: ['consent'] },
    });

    expect(collector.destinations['eager']).toBeDefined();
    expect(collector.pending.destinations['eager']).toBeUndefined();
  });

  test('startup globals route through command (bump stateVersion + reconcile)', async () => {
    const { collector } = await startFlow({
      run: false,
      globals: { lang: 'en' },
    });

    // Object.assign at startup bumped nothing; routing through command bumps.
    expect(collector.globals).toEqual({ lang: 'en' });
    expect(collector.stateVersion).toBeGreaterThan(0);
  });

  test('startup globals satisfy a pending destination require', async () => {
    const mockPush = jest.fn();
    const { collector } = await startFlow({
      run: false,
      globals: { lang: 'en' },
      destinations: {
        ga4: {
          code: { push: mockPush, config: {} },
          config: { require: ['globals'] },
        },
      },
    });

    expect(collector.destinations['ga4']).toBeDefined();
  });
});
