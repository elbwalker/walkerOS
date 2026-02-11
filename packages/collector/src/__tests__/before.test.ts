import type { Source, WalkerOS } from '@walkeros/core';
import { normalizeBeforeConditions } from '../before';
import { startFlow } from '../flow';

describe('normalizeBeforeConditions', () => {
  test('string condition normalizes to PendingCondition with undefined test', () => {
    const conditions: Source.BeforeCondition[] = ['consent'];
    const result = normalizeBeforeConditions(conditions);
    expect(result).toEqual([{ type: 'consent', test: undefined }]);
  });

  test('multiple string conditions', () => {
    const conditions: Source.BeforeCondition[] = ['consent', 'user'];
    const result = normalizeBeforeConditions(conditions);
    expect(result).toEqual([
      { type: 'consent', test: undefined },
      { type: 'user', test: undefined },
    ]);
  });

  test('object condition normalizes with test function', () => {
    const testFn = (data: WalkerOS.Consent) => !!data.marketing;
    const conditions: Source.BeforeCondition[] = [{ consent: testFn }];
    const result = normalizeBeforeConditions(conditions);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('consent');
    expect(result[0].test).toBeDefined();
    expect(result[0].test!({ marketing: true })).toBe(true);
    expect(result[0].test!({ marketing: false })).toBe(false);
  });

  test('mixed string and object conditions', () => {
    const conditions: Source.BeforeCondition[] = [
      'run',
      { consent: (data: WalkerOS.Consent) => !!data.marketing },
    ];
    const result = normalizeBeforeConditions(conditions);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'run', test: undefined });
    expect(result[1].type).toBe('consent');
    expect(result[1].test).toBeDefined();
  });

  test('undefined returns empty array', () => {
    expect(normalizeBeforeConditions(undefined)).toEqual([]);
  });

  test('empty array returns empty array', () => {
    expect(normalizeBeforeConditions([])).toEqual([]);
  });
});

describe('activatePendingSources', () => {
  test('pending source inits when simple string condition fires', async () => {
    const mockInit = jest.fn().mockResolvedValue({
      type: 'deferred',
      config: {},
      push: jest.fn(),
    });

    const { collector, elb } = await startFlow({
      sources: {
        deferred: {
          code: mockInit,
          config: { before: ['consent'] },
        },
      },
    });

    expect(mockInit).not.toHaveBeenCalled();

    await elb('walker consent', { marketing: true });

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(collector.sources['deferred']).toBeDefined();
    expect(collector.pendingSources).toHaveLength(0);
  });

  test('conditional before: function must return true', async () => {
    const mockInit = jest.fn().mockResolvedValue({
      type: 'conditional',
      config: {},
      push: jest.fn(),
    });

    const { collector, elb } = await startFlow({
      sources: {
        conditional: {
          code: mockInit,
          config: {
            before: [{ consent: (data: WalkerOS.Consent) => !!data.marketing }],
          },
        },
      },
    });

    // analytics consent — condition NOT met
    await elb('walker consent', { analytics: true });
    expect(mockInit).not.toHaveBeenCalled();
    expect(collector.pendingSources).toHaveLength(1);

    // marketing consent — condition met
    await elb('walker consent', { marketing: true });
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(collector.pendingSources).toHaveLength(0);
  });

  test('multiple conditions: ALL must be met', async () => {
    const mockInit = jest.fn().mockResolvedValue({
      type: 'multi',
      config: {},
      push: jest.fn(),
    });

    const { collector, elb } = await startFlow({
      sources: {
        multi: {
          code: mockInit,
          config: { before: ['consent', 'run'] },
        },
      },
      run: false,
    });

    // Consent alone not enough
    await elb('walker consent', { marketing: true });
    expect(mockInit).not.toHaveBeenCalled();
    expect(collector.pendingSources[0].conditions).toHaveLength(1);

    // Run fulfills remaining condition
    await elb('walker run');
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(collector.pendingSources).toHaveLength(0);
  });

  test('condition receives correct typed context data', async () => {
    let receivedData: unknown;
    const mockInit = jest.fn().mockResolvedValue({
      type: 'typed',
      config: {},
      push: jest.fn(),
    });

    const { elb } = await startFlow({
      sources: {
        typed: {
          code: mockInit,
          config: {
            before: [
              {
                consent: (data: WalkerOS.Consent) => {
                  receivedData = data;
                  return !!data.marketing;
                },
              },
            ],
          },
        },
      },
    });

    await elb('walker consent', { marketing: true, analytics: true });
    expect(receivedData).toEqual(
      expect.objectContaining({ marketing: true, analytics: true }),
    );
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
          config: { before: ['session'] },
        },
      },
    });

    await elb('walker consent', { marketing: true });
    await elb('walker user', { id: 'u1' });

    expect(mockInit).not.toHaveBeenCalled();
    expect(collector.pendingSources).toHaveLength(1);
  });
});

describe('chained cascade (re-entrancy)', () => {
  test('consent -> session inits -> fires user -> dataLayer inits', async () => {
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
        session: { code: mockSession, config: { before: ['consent'] } },
        dataLayer: { code: mockDataLayer, config: { before: ['user'] } },
      },
    });

    expect(initOrder).toEqual([]);
    expect(collector.pendingSources).toHaveLength(2);

    await elb('walker consent', { marketing: true });

    expect(initOrder).toEqual(['session', 'dataLayer']);
    expect(collector.sources['session']).toBeDefined();
    expect(collector.sources['dataLayer']).toBeDefined();
    expect(collector.user).toEqual(
      expect.objectContaining({ session: 'sess-1' }),
    );
    expect(collector.pendingSources).toHaveLength(0);
  });

  test('triple chain: consent -> A (fires user) -> B (fires globals) -> C', async () => {
    const initOrder: string[] = [];

    const sourceA = jest.fn().mockImplementation(async (ctx: any) => {
      initOrder.push('A');
      await ctx.env.command('user', { id: 'u1' });
      return { type: 'A', config: {}, push: jest.fn() };
    });

    const sourceB = jest.fn().mockImplementation(async (ctx: any) => {
      initOrder.push('B');
      await ctx.env.command('globals', { env: 'prod' });
      return { type: 'B', config: {}, push: jest.fn() };
    });

    const sourceC = jest.fn().mockImplementation(async () => {
      initOrder.push('C');
      return { type: 'C', config: {}, push: jest.fn() };
    });

    const { collector, elb } = await startFlow({
      sources: {
        a: { code: sourceA, config: { before: ['consent'] } },
        b: { code: sourceB, config: { before: ['user'] } },
        c: { code: sourceC, config: { before: ['globals'] } },
      },
    });

    await elb('walker consent', { marketing: true });

    expect(initOrder).toEqual(['A', 'B', 'C']);
    expect(collector.pendingSources).toHaveLength(0);
  });

  test('re-entrancy does not double-init', async () => {
    let initCount = 0;

    const sourceA = jest.fn().mockImplementation(async (ctx: any) => {
      initCount++;
      await ctx.env.command('consent', { analytics: true });
      return { type: 'A', config: {}, push: jest.fn() };
    });

    const { collector, elb } = await startFlow({
      sources: {
        a: { code: sourceA, config: { before: ['consent'] } },
      },
    });

    await elb('walker consent', { marketing: true });

    expect(initCount).toBe(1);
    expect(collector.pendingSources).toHaveLength(0);
  });
});
