import { startFlow } from '../flow';

describe('queue state refresh', () => {
  test('queued events receive updated user state after user command', async () => {
    const pushCalls: any[] = [];
    const mockPush = jest.fn().mockImplementation((event) => {
      pushCalls.push(event);
    });

    const { elb } = await startFlow({
      destinations: {
        dest: {
          code: { push: mockPush, config: {} },
          config: { require: ['user'] },
        },
      },
    });

    await elb('page view', { title: 'Home' });
    await elb('product view', { id: 'p1' });
    expect(mockPush).not.toHaveBeenCalled();

    await elb('walker user', { id: 'u1', session: 'sess-1' });

    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(pushCalls[0].user).toEqual(
      expect.objectContaining({ id: 'u1', session: 'sess-1' }),
    );
    expect(pushCalls[1].user).toEqual(
      expect.objectContaining({ id: 'u1', session: 'sess-1' }),
    );
  });

  test('queued events receive updated globals after globals command', async () => {
    const pushCalls: any[] = [];
    const mockPush = jest.fn().mockImplementation((event) => {
      pushCalls.push(event);
    });

    const { elb } = await startFlow({
      destinations: {
        dest: {
          code: { push: mockPush, config: {} },
          config: { require: ['user'] },
        },
      },
    });

    await elb('page view', { title: 'Home' });
    await elb('walker globals', { appVersion: '2.0' });
    await elb('walker user', { id: 'u1' });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(pushCalls[0].globals).toEqual(
      expect.objectContaining({ appVersion: '2.0' }),
    );
  });

  test('user flush does not bypass consent check', async () => {
    const mockPush = jest.fn();

    const { collector, elb } = await startFlow({
      destinations: {
        dest: {
          code: { push: mockPush, config: {} },
          config: {
            require: ['user'],
            consent: { marketing: true },
          },
        },
      },
    });

    await elb('page view', { title: 'Home' });
    await elb('walker user', { id: 'u1' });

    expect(collector.destinations['dest']).toBeDefined();
    expect(mockPush).not.toHaveBeenCalled();

    await elb('walker consent', { marketing: true });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'page view',
        user: expect.objectContaining({ id: 'u1' }),
        consent: expect.objectContaining({ marketing: true }),
      }),
      expect.anything(),
    );
  });

  test('consent first, user second — events flushed with both states', async () => {
    const pushCalls: any[] = [];
    const mockPush = jest.fn().mockImplementation((event) => {
      pushCalls.push(event);
    });

    const { elb } = await startFlow({
      destinations: {
        dest: {
          code: { push: mockPush, config: {} },
          config: {
            require: ['user'],
            consent: { marketing: true },
          },
        },
      },
    });

    await elb('page view', { title: 'Home' });
    await elb('walker consent', { marketing: true });
    expect(mockPush).not.toHaveBeenCalled();

    await elb('walker user', { id: 'u1' });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(pushCalls[0].user).toEqual(expect.objectContaining({ id: 'u1' }));
    expect(pushCalls[0].consent).toEqual(
      expect.objectContaining({ marketing: true }),
    );
  });

  test('collector globals and user merge into current event', async () => {
    const pushCalls: any[] = [];
    const mockPush = jest.fn().mockImplementation((event) => {
      pushCalls.push(event);
    });

    const { elb } = await startFlow({
      destinations: {
        dest: { code: { push: mockPush, config: {} } },
      },
      user: { id: 'collector-user' },
      globals: { app: 'test' },
    });

    // Event has its own user.session — collector.user.id should merge in
    await elb({
      name: 'page view',
      user: { session: 's1' },
      globals: { page: 'home' },
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    // Collector as base, event overrides
    expect(pushCalls[0].user).toEqual(
      expect.objectContaining({ id: 'collector-user', session: 's1' }),
    );
    expect(pushCalls[0].globals).toEqual(
      expect.objectContaining({ app: 'test', page: 'home' }),
    );
  });

  test('queued events merge collector state with event-specific data', async () => {
    const pushCalls: any[] = [];
    const mockPush = jest.fn().mockImplementation((event) => {
      pushCalls.push(event);
    });

    const { collector, elb } = await startFlow({
      destinations: {},
    });

    // Push event with user.session before destination exists
    await elb({
      name: 'page view',
      user: { session: 's1' },
    });

    // Update collector state
    collector.consent = { demo: true };
    collector.user = { id: 'new-user' };

    // Add destination — queued event should get merged state
    await elb(
      'walker destination',
      { push: mockPush, config: {} },
      {
        id: 'late',
      },
    );

    expect(mockPush).toHaveBeenCalledTimes(1);
    // consent: merge (collector as base, event overrides)
    expect(pushCalls[0].consent).toEqual(
      expect.objectContaining({ demo: true }),
    );
    // user: merge (collector id + event session)
    expect(pushCalls[0].user).toEqual(
      expect.objectContaining({ id: 'new-user', session: 's1' }),
    );
  });

  test('consent revoke retries queue but events stay queued', async () => {
    const mockPush = jest.fn();

    const { elb } = await startFlow({
      destinations: {
        gated: {
          code: { push: mockPush, config: {} },
          config: { consent: { test: true } },
        },
      },
    });

    await elb('page view');
    expect(mockPush).not.toHaveBeenCalled();

    // Revoke: flush retries queue, events fail consent, stay queued
    const result = await elb('walker consent', { test: false });
    expect(result.ok).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();

    // Grant: events finally delivered
    await elb('walker consent', { test: true });
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test('consent-queued events are flushed on consent without consentRunQueue flag', async () => {
    const mockPush = jest.fn();

    const { elb } = await startFlow({
      destinations: {
        dest: {
          code: { push: mockPush, config: {} },
          config: { consent: { marketing: true } },
        },
      },
    });

    await elb('page view', { title: 'Home' });
    expect(mockPush).not.toHaveBeenCalled();

    await elb('walker consent', { marketing: true });
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'page view' }),
      expect.anything(),
    );
  });
});
