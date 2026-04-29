import { collector } from '../collector';
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
});
