import { createNodeClient } from '../';

describe('Commands', () => {
  function getClient() {
    return createNodeClient();
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('user', async () => {
    const { elb, instance } = getClient();
    expect(instance.config).toHaveProperty('user', {});

    let result = await elb('entity action');
    expect(result.event).toHaveProperty('user', {});

    result = await elb('walker user');

    expect(result.command).toHaveProperty('name', 'user');
    expect(result.command).toHaveProperty('data', {});

    result = await elb('walker user', { not: 'relevant' });
    expect(result.command).toHaveProperty('data', {});

    result = await elb('walker user', { id: '1d' });
    expect(result.command).toHaveProperty('data', { id: '1d' });
    expect(instance.config).toHaveProperty('user', { id: '1d' });

    result = await elb('walker user', { id: undefined });
    expect(result.command).toHaveProperty('data', { id: undefined });
    expect(instance.config).toHaveProperty('user', { id: undefined });

    result = await elb('walker user', { device: 'd3v1c3' });
    expect(result.command).toHaveProperty('data', { device: 'd3v1c3' });
    expect(instance.config).toHaveProperty('user', { device: 'd3v1c3' });

    result = await elb('walker user', { session: 's3ss10n' });
    expect(result.command).toHaveProperty('data', { session: 's3ss10n' });
    expect(instance.config).toHaveProperty('user', { session: 's3ss10n' });
  });
});
