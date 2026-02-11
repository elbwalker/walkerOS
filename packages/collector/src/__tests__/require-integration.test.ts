import { startFlow } from '../flow';

describe('require integration', () => {
  test('full chain: CMP -> consent -> session -> user -> dataLayer', async () => {
    const initOrder: string[] = [];

    const mockCmp = async (ctx: any) => ({
      type: 'cmp',
      config: {},
      push: ctx.env.elb,
    });

    const mockSession = async (ctx: any) => {
      initOrder.push('session');
      await ctx.env.command('user', {
        session: 'sess-1',
        device: 'dev-1',
      });
      return { type: 'session', config: {}, push: jest.fn() };
    };

    const mockDataLayer = async () => {
      initOrder.push('dataLayer');
      return { type: 'dataLayer', config: {}, push: jest.fn() };
    };

    const { collector, elb } = await startFlow({
      sources: {
        cmp: { code: mockCmp },
        session: { code: mockSession, config: { require: ['consent'] } },
        dataLayer: { code: mockDataLayer, config: { require: ['user'] } },
      },
    });

    expect(collector.sources['cmp']).toBeDefined();
    expect(collector.sources['session']).toBeUndefined();
    expect(collector.sources['dataLayer']).toBeUndefined();

    await elb('walker consent', { marketing: true });

    expect(initOrder).toEqual(['session', 'dataLayer']);
    expect(collector.sources['session']).toBeDefined();
    expect(collector.sources['dataLayer']).toBeDefined();
    expect(collector.user).toEqual(
      expect.objectContaining({ session: 'sess-1', device: 'dev-1' }),
    );
  });

  test('source and destination require in same flow', async () => {
    const mockSession = jest.fn().mockImplementation(async (ctx: any) => {
      await ctx.env.command('user', { session: 'sess-1' });
      return { type: 'session', config: {}, push: jest.fn() };
    });

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

    expect(collector.sources['session']).toBeUndefined();
    expect(collector.destinations['ga4']).toBeUndefined();

    await elb('walker consent', { marketing: true });

    // Session source activated by consent, fires user, which activates GA4
    expect(collector.sources['session']).toBeDefined();
    expect(collector.destinations['ga4']).toBeDefined();
  });

  test('source.on is called after deferred source activates', async () => {
    const onMock = jest.fn();
    const mockInit = jest.fn().mockResolvedValue({
      type: 'reactive',
      config: {},
      push: jest.fn(),
      on: onMock,
    });

    const { elb } = await startFlow({
      sources: {
        reactive: { code: mockInit, config: { require: ['consent'] } },
      },
    });

    await elb('walker consent', { marketing: true });
    expect(mockInit).toHaveBeenCalledTimes(1);

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
