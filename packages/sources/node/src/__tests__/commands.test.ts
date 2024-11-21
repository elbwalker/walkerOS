import type { SourceNode } from '../types';
import { createSourceNode } from '../';

describe('Commands', () => {
  function getSource(custom?: Partial<SourceNode.InitConfig>) {
    return createSourceNode(custom);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('walker config', async () => {
    const { elb, instance } = getSource();
    expect(instance).toHaveProperty('user', {});

    await elb('walker config', { tagging: 42 });
    expect(instance.config.tagging).toBe(42);
  });

  test('walker custom', async () => {
    const { elb, instance } = getSource({ custom: { static: 'value' } });

    expect(instance).toStrictEqual(
      expect.objectContaining({
        custom: { static: 'value' },
      }),
    );

    await elb('walker custom', { foo: 'bar' });
    await elb('walker custom', { another: 'value' });
    await elb('walker custom', { static: 'override' });
    await elb('foo bar');
    expect(instance).toStrictEqual(
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
    const { elb, instance } = getSource();
    expect(instance).toHaveProperty('user', {});

    let result = await elb('entity action');
    expect(result.event).toHaveProperty('user', {});

    result = await elb('walker user');

    expect(instance.user).toStrictEqual({});

    result = await elb('walker user', { id: '1d' });
    expect(instance.user).toStrictEqual({ id: '1d' });

    result = await elb('walker user', { id: undefined });
    expect(instance.user).toStrictEqual({ id: undefined });
  });
});
