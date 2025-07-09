import type { ServerCollector } from '../types';
import { createServerCollector } from '../';

describe('Commands', () => {
  function getSource(custom?: Partial<ServerCollector.InitConfig>) {
    return createServerCollector(custom);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('walker config', async () => {
    const { elb, collector } = getSource();
    expect(collector).toHaveProperty('user', {});

    await elb('walker config', { tagging: 42 });
    expect(collector.config.tagging).toBe(42);
  });

  test('walker custom', async () => {
    const { elb, collector } = getSource({ custom: { static: 'value' } });

    expect(collector).toStrictEqual(
      expect.objectContaining({
        custom: { static: 'value' },
      }),
    );

    await elb('walker custom', { foo: 'bar' });
    await elb('walker custom', { another: 'value' });
    await elb('walker custom', { static: 'override' });
    await elb('foo bar');
    expect(collector).toStrictEqual(
      expect.objectContaining({
        custom: {
          static: 'override',
          foo: 'bar',
          another: 'value',
        },
      }),
    );
  });

  test('walker user', async () => {
    const { elb, collector } = getSource();
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
