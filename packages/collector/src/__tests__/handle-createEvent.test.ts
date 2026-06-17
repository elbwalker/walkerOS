import { collector } from '../collector';
import { startFlow } from '..';
import { createEvent } from '../handle';

describe('createEvent v4', () => {
  it('generates W3C span_id for event.id', async () => {
    const c = await collector({});
    const ev = createEvent(c, { name: 'page view' });
    expect(ev.id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('passes through provided source.type and adds collector defaults if absent', async () => {
    const c = await collector({});
    const ev = createEvent(c, {
      name: 'page view',
      source: { type: 'browser', url: 'https://x.test/' },
    });
    expect(ev.source.type).toBe('browser');
    expect(ev.source.url).toBe('https://x.test/');
  });

  it('initialises run-scoped trace state', async () => {
    const c = await collector({});
    expect(c.count).toBe(0);
    expect(c.trace).toBeUndefined();
  });

  it('stamps source.trace from the run and increments source.count per event', async () => {
    const { collector: c } = await startFlow();
    const e1 = createEvent(c, { name: 'page view' });
    const e2 = createEvent(c, { name: 'page view' });
    const e3 = createEvent(c, { name: 'page view' });
    expect(e1.source.trace).toBe(c.trace);
    expect(e2.source.trace).toBe(c.trace);
    expect([e1.source.count, e2.source.count, e3.source.count]).toEqual([
      1, 2, 3,
    ]);
    expect(e1.id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('never overwrites trace/count/id already set on a forwarded event', async () => {
    const { collector: c } = await startFlow();
    const forwarded = createEvent(c, {
      name: 'page view',
      id: 'aaaaaaaaaaaaaaaa',
      source: { type: 'express', trace: 'f'.repeat(32), count: 7 },
    });
    expect(forwarded.id).toBe('aaaaaaaaaaaaaaaa');
    expect(forwarded.source.trace).toBe('f'.repeat(32));
    expect(forwarded.source.count).toBe(7);
    expect(c.count).toBe(0);
  });
});
