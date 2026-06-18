import { startFlow } from '..';

describe('run-scoped trace', () => {
  it('mints a fresh 32-hex trace and resets count on each run', async () => {
    const { collector: c } = await startFlow();
    const first = c.trace;
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(c.count).toBe(0);

    await c.command('run');
    expect(c.trace).toMatch(/^[0-9a-f]{32}$/);
    expect(c.trace).not.toBe(first);
    expect(c.count).toBe(0);
  });

  it('preserves inbound trace/span/count through a second collector', async () => {
    const { collector: server } = await startFlow();
    const inbound = {
      name: 'order complete',
      id: '1111111111111111',
      source: { type: 'express', trace: 'a'.repeat(32), count: 2 },
    };
    const { event } = await server.push(inbound);
    expect(event?.id).toBe('1111111111111111');
    expect(event?.source.trace).toBe('a'.repeat(32));
    expect(event?.source.count).toBe(2);
    expect(server.count).toBe(0);
  });
});
