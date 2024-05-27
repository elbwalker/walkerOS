import { createNodeClient } from '../';
import type { NodeClient } from '../types';

describe('Commands', () => {
  function getClient(custom?: Partial<NodeClient.InitConfig>) {
    return createNodeClient(custom);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('walker config', async () => {
    const { elb, instance } = getClient();
    expect(instance).toHaveProperty('user', {});

    let result = await elb('walker config');

    expect(result.command).toHaveProperty('name', 'config');

    result = await elb('walker config', { tagging: 1 });
    // expect(result.command!.data).toHaveProperty('tagging', 1);
    expect(result.command!.data).toStrictEqual(
      expect.objectContaining({
        tagging: 1,
      }),
    );
    expect(instance.config).toHaveProperty('tagging', 1);
  });

  test('walker custom', async () => {
    const { elb, instance } = getClient({ custom: { static: 'value' } });

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
    const { elb, instance } = getClient();
    expect(instance).toHaveProperty('user', {});

    let result = await elb('entity action');
    expect(result.event).toHaveProperty('user', {});

    result = await elb('walker user');

    expect(result.command).toHaveProperty('name', 'user');
    expect(result.command).toHaveProperty('data', {});

    result = await elb('walker user', { not: 'relevant' });
    expect(result.command).toHaveProperty('data', {});

    result = await elb('walker user', { id: '1d' });
    expect(result.command).toHaveProperty('data', { id: '1d' });
    expect(instance).toHaveProperty('user', { id: '1d' });

    result = await elb('walker user', { id: undefined });
    expect(result.command).toHaveProperty('data', { id: undefined });
    expect(instance).toHaveProperty('user', { id: undefined });

    result = await elb('walker user', { device: 'd3v1c3' });
    expect(result.command).toHaveProperty('data', { device: 'd3v1c3' });
    expect(instance).toHaveProperty('user', { device: 'd3v1c3' });

    result = await elb('walker user', { session: 's3ss10n' });
    expect(result.command).toHaveProperty('data', { session: 's3ss10n' });
    expect(instance).toHaveProperty('user', { session: 's3ss10n' });
  });
});
