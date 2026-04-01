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
