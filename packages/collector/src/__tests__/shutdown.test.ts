import type { Destination, Source, Transformer } from '@walkeros/core';
import { startFlow } from '..';

describe('shutdown command', () => {
  it('calls destroy on all destinations', async () => {
    const destroyFn = jest.fn();
    const { collector, elb } = await startFlow({});

    const dest: Destination.Instance = {
      config: { settings: { key: 'value' } },
      push: jest.fn(),
      type: 'test-dest',
      destroy: destroyFn,
    };
    collector.destinations['test'] = dest;

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

    const src: Source.Instance = {
      type: 'express',
      config: {},
      push: jest.fn(),
      destroy: destroyFn,
    };
    collector.sources['express'] = src;

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

    const xfm: Transformer.Instance = {
      type: 'enricher',
      config: {},
      push: jest.fn(),
      destroy: destroyFn,
    };
    collector.transformers['enrich'] = xfm;

    await elb('walker shutdown');

    expect(destroyFn).toHaveBeenCalledTimes(1);
  });

  it('continues if one destroy throws', async () => {
    const failDestroy = jest.fn().mockRejectedValue(new Error('boom'));
    const okDestroy = jest.fn();
    const { collector, elb } = await startFlow({});

    const failDest: Destination.Instance = {
      config: {},
      push: jest.fn(),
      type: 'fail',
      destroy: failDestroy,
    };
    const okDest: Destination.Instance = {
      config: {},
      push: jest.fn(),
      type: 'ok',
      destroy: okDestroy,
    };
    collector.destinations['fail'] = failDest;
    collector.destinations['ok'] = okDest;

    await elb('walker shutdown');

    expect(failDestroy).toHaveBeenCalled();
    expect(okDestroy).toHaveBeenCalled();
  });

  it('skips steps without destroy', async () => {
    const { collector, elb } = await startFlow({});

    const dest: Destination.Instance = {
      config: {},
      push: jest.fn(),
      type: 'simple',
    };
    collector.destinations['nodestroy'] = dest;

    await elb('walker shutdown');
  });

  it('respects shutdown order: sources before destinations before transformers', async () => {
    const order: string[] = [];
    const { collector, elb } = await startFlow({});

    const http: Source.Instance = {
      type: 'express',
      config: {},
      push: jest.fn(),
      destroy: jest.fn().mockImplementation(() => {
        order.push('source');
      }),
    };
    const db: Destination.Instance = {
      config: {},
      push: jest.fn(),
      type: 'bigquery',
      destroy: jest.fn().mockImplementation(() => {
        order.push('destination');
      }),
    };
    const enrich: Transformer.Instance = {
      type: 'enricher',
      config: {},
      push: jest.fn(),
      destroy: jest.fn().mockImplementation(() => {
        order.push('transformer');
      }),
    };
    collector.sources['http'] = http;
    collector.destinations['db'] = db;
    collector.transformers['enrich'] = enrich;

    await elb('walker shutdown');

    expect(order).toEqual(['source', 'destination', 'transformer']);
  });
});
