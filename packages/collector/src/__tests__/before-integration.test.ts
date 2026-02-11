import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '../flow';

describe('before integration', () => {
  test('full chain: CMP -> consent -> session -> user -> dataLayer', async () => {
    const initOrder: string[] = [];

    const mockCmp = async (ctx: any) => ({
      type: 'cmp',
      config: {},
      push: ctx.env.elb, // Use ELB push so walker commands route correctly
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
        session: { code: mockSession, config: { before: ['consent'] } },
        dataLayer: { code: mockDataLayer, config: { before: ['user'] } },
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

  test('conditional consent: marketing must be true', async () => {
    const mockInit = jest.fn().mockResolvedValue({
      type: 'marketing',
      config: {},
      push: jest.fn(),
    });

    const { collector, elb } = await startFlow({
      sources: {
        marketing: {
          code: mockInit,
          config: {
            before: [{ consent: (data: WalkerOS.Consent) => !!data.marketing }],
          },
        },
      },
    });

    await elb('walker consent', { analytics: true });
    expect(mockInit).not.toHaveBeenCalled();

    await elb('walker consent', { marketing: true });
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(collector.sources['marketing']).toBeDefined();
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
        reactive: { code: mockInit, config: { before: ['consent'] } },
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
});
