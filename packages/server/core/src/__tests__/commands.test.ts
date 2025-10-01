import type { Collector } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';

describe('Commands', () => {
  async function getCollector(custom?: Partial<Collector.Config>) {
    const { elb, collector } = await createCollector(custom || {});
    return {
      elb,
      collector,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('walker config', async () => {
    const { elb, collector } = await getCollector();
    expect(collector).toHaveProperty('user', {});
    expect(collector.config.tagging).toBe(0); // Initial value

    const result = await elb('walker config', { tagging: 42 });
    expect(result.ok).toBe(true);
    expect(collector.config.tagging).toBe(42);
  });

  test('walker custom', async () => {
    const { elb, collector } = await getCollector({
      custom: { static: 'value' },
    });

    expect(collector.custom).toStrictEqual({
      static: 'value',
    });

    await elb('walker custom', { foo: 'bar' });
    await elb('walker custom', { another: 'value' });
    await elb('walker custom', { static: 'override' });
    await elb('foo bar');
    expect(collector.custom).toStrictEqual({
      static: 'override',
      foo: 'bar',
      another: 'value',
    });
  });

  test('walker user', async () => {
    const { elb, collector } = await getCollector();
    expect(collector).toHaveProperty('user', {});

    let result = await elb('entity action');
    expect(result.event).toHaveProperty('user', {});

    result = await elb('walker user');

    expect(collector.user).toStrictEqual({});

    result = await elb('walker user', { id: '1d' });
    expect(collector.user).toStrictEqual({ id: '1d' });

    result = await elb('walker user', { id: undefined });
    expect(collector.user).toStrictEqual({ id: undefined });
  });
});
