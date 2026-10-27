import { createEvent, getEvent } from '..';

describe('createEvent', () => {
  const timestamp = 1700000000000;

  const defaultEvent = {
    name: 'entity action',
    data: {
      string: 'foo',
      number: 1,
      boolean: true,
      array: [0, 'text', false],
      not: undefined,
    },
    context: { dev: ['test', 1] },
    globals: { lang: 'elb' },
    custom: { completely: 'random' },
    user: { id: 'us3r', device: 'c00k13', session: 's3ss10n' },
    nested: [
      {
        entity: 'child',
        data: { is: 'subordinated' },
      },
    ],
    consent: { functional: true },
    id: expect.stringMatching(/^[0-9a-f]{16}$/),
    trigger: 'test',
    entity: 'entity',
    action: 'action',
    timestamp,
    timing: 3.14,
    source: {
      type: 'collector',
      schema: '4',
      count: 1,
      trace: expect.stringMatching(/^[0-9a-f]{32}$/),
    },
  };

  test('regular', () => {
    expect(createEvent()).toStrictEqual(defaultEvent);
  });

  it('produces v4-shaped events with W3C span_id', () => {
    const ev = createEvent({ name: 'page view' });
    expect(ev.id).toMatch(/^[0-9a-f]{16}$/);
    expect(ev.source.type).toBe('collector');
    expect(ev.source.schema).toBe('4');
  });

  test('getEvent', () => {
    expect(getEvent('page view')).toStrictEqual(
      expect.objectContaining({
        name: 'page view',
        data: {
          domain: 'www.example.com',
          title: 'walkerOS documentation',
          referrer: 'https://www.walkeros.io/',
          search: '?foo=bar',
          hash: '#hash',
          id: '/docs/',
        },
        globals: { pagegroup: 'docs' },
        entity: 'page',
        action: 'view',
      }),
    );

    expect(getEvent('page view', { data: { id: '/custom' } })).toStrictEqual(
      expect.objectContaining({
        name: 'page view',
        data: { id: '/custom' },
        trigger: 'load',
        entity: 'page',
        action: 'view',
      }),
    );

    expect(getEvent('promotion visible')).toStrictEqual(
      expect.objectContaining({
        name: 'promotion visible',
        data: {
          id: 'promo_autumn26',
          name: 'Setting up tracking easily',
          slot: 'hero',
        },
        trigger: 'visible',
      }),
    );
  });
});

describe('getEvent', () => {
  it('returns the same event on every call and every day', () => {
    const a = getEvent('order complete');
    jest.useFakeTimers().setSystemTime(new Date('2031-01-01T12:00:00Z'));
    const b = getEvent('order complete');
    jest.useRealTimers();
    expect(b).toEqual(a);
    expect(a.timestamp).toBe(1700000000000);
  });

  it('derives the id from the name', () => {
    expect(getEvent('page view').id).toBe('f0cc5f6fec3d8eeb');
    expect(getEvent('page view').id).not.toBe(getEvent('product view').id);
  });

  it('keeps explicit props', () => {
    expect(getEvent('page view', { timestamp: 5 }).timestamp).toBe(5);
    expect(getEvent('page view', { id: 'custom' }).id).toBe('custom');
  });

  it('carries the order value as data.value', () => {
    expect(getEvent('order complete').data).toStrictEqual({
      id: '0rd3r1d',
      currency: 'EUR',
      value: 462,
      tax: 73.76,
      shipping: 5.22,
      total: 467.22,
    });
  });

  it('accepts only standard event names', () => {
    // @ts-expect-error unknown standard event names do not compile
    expect(getEvent('not a standard event').name).toBe('not a standard event');
  });
});
