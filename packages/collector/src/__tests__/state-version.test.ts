import { startFlow } from '..';

describe('stateVersion counter', () => {
  test('bumps once per accepted state mutation (consent + user = +2)', async () => {
    const { collector, elb } = await startFlow();

    const baseline = collector.stateVersion;

    await elb('walker consent', { marketing: true });
    await elb('walker user', { id: 'a' });

    expect(collector.stateVersion).toBe(baseline + 2);
  });

  test('second identical consent still bumps (value-independent)', async () => {
    const { collector, elb } = await startFlow();

    await elb('walker consent', { marketing: true });
    const afterFirst = collector.stateVersion;

    await elb('walker consent', { marketing: true });

    expect(collector.stateVersion).toBe(afterFirst + 1);
  });

  test('run command merging consent bumps stateVersion', async () => {
    const { collector, elb } = await startFlow({ run: false });

    const baseline = collector.stateVersion;

    await elb('walker run', { consent: { marketing: true } });

    expect(collector.stateVersion).toBeGreaterThan(baseline);
  });

  test('records consent before run while not allowed', async () => {
    const { collector, elb } = await startFlow({ run: false });

    await elb('walker consent', { marketing: true });

    expect(collector.consent).toEqual({ marketing: true });
    expect(collector.allowed).toBe(false);
  });
});
