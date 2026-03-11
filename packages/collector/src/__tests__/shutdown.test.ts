import { startFlow } from '..';

describe('shutdown command', () => {
  it('calls destroy on all destinations', async () => {
    const destroyFn = jest.fn();
    const { collector, elb } = await startFlow({});

    collector.destinations['test'] = {
      config: { settings: { key: 'value' } },
      push: jest.fn(),
      type: 'test-dest',
      destroy: destroyFn,
    } as any;

    await elb('walker shutdown');

    expect(destroyFn).toHaveBeenCalledTimes(1);
    expect(destroyFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test',
        config: expect.objectContaining({ settings: { key: 'value' } }),
        logger: expect.any(Object),
      }),
    );
  });

  it('calls destroy on all sources', async () => {
    const destroyFn = jest.fn();
    const { collector, elb } = await startFlow({});

    collector.sources['express'] = {
      type: 'express',
      config: {},
      push: jest.fn(),
      destroy: destroyFn,
    } as any;

    await elb('walker shutdown');

    expect(destroyFn).toHaveBeenCalledTimes(1);
    expect(destroyFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'express',
        logger: expect.any(Object),
      }),
    );
  });

  it('calls destroy on all transformers', async () => {
    const destroyFn = jest.fn();
    const { collector, elb } = await startFlow({});

    collector.transformers['enrich'] = {
      type: 'enricher',
      config: {},
      push: jest.fn(),
      destroy: destroyFn,
    } as any;

    await elb('walker shutdown');

    expect(destroyFn).toHaveBeenCalledTimes(1);
  });

  it('continues if one destroy throws', async () => {
    const failDestroy = jest.fn().mockRejectedValue(new Error('boom'));
    const okDestroy = jest.fn();
    const { collector, elb } = await startFlow({});

    collector.destinations['fail'] = {
      config: {},
      push: jest.fn(),
      type: 'fail',
      destroy: failDestroy,
    } as any;
    collector.destinations['ok'] = {
      config: {},
      push: jest.fn(),
      type: 'ok',
      destroy: okDestroy,
    } as any;

    await elb('walker shutdown');

    expect(failDestroy).toHaveBeenCalled();
    expect(okDestroy).toHaveBeenCalled();
  });

  it('skips steps without destroy', async () => {
    const { collector, elb } = await startFlow({});

    collector.destinations['nodestroy'] = {
      config: {},
      push: jest.fn(),
      type: 'simple',
    } as any;

    await elb('walker shutdown');
  });

  it('respects shutdown order: sources before destinations before transformers', async () => {
    const order: string[] = [];
    const { collector, elb } = await startFlow({});

    collector.sources['http'] = {
      type: 'express',
      config: {},
      push: jest.fn(),
      destroy: jest.fn().mockImplementation(() => {
        order.push('source');
      }),
    } as any;
    collector.destinations['db'] = {
      config: {},
      push: jest.fn(),
      type: 'bigquery',
      destroy: jest.fn().mockImplementation(() => {
        order.push('destination');
      }),
    } as any;
    collector.transformers['enrich'] = {
      type: 'enricher',
      config: {},
      push: jest.fn(),
      destroy: jest.fn().mockImplementation(() => {
        order.push('transformer');
      }),
    } as any;

    await elb('walker shutdown');

    expect(order).toEqual(['source', 'destination', 'transformer']);
  });
});
